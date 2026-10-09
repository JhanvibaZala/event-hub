import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Sequelize } from 'sequelize-typescript';
import * as crypto from 'node:crypto';
import { Registration } from './models/registration.model';
import { Event } from '../events/models/event.model';
import { Category } from '../categories/models/category.model';
import { User } from '../users/models/user.model';
import { Notification } from '../notifications/models/notification.model';
import { RabbitmqService, EXCHANGES, ROUTING_KEYS } from '../rabbitmq/rabbitmq.service';
import { PaginationQueryDto, PaginatedResult } from '../common/dto/pagination-query.dto';
import { RequestUser } from '../common/decorators/current-user.decorator';

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectModel(Registration)
    private readonly registrationModel: typeof Registration,
    @InjectModel(Event)
    private readonly eventModel: typeof Event,
    private readonly sequelize: Sequelize,
    private readonly rabbitmqService: RabbitmqService,
    @Optional()
    @InjectModel(Notification)
    private readonly notificationModel?: typeof Notification,
  ) {}

  async register(eventId: string, userId: string): Promise<Registration> {
    // 1. Check if user already has an active registration for this event
    const existing = await this.registrationModel.findOne({
      where: { eventId, userId },
    });

    if (existing && existing.status !== 'CANCELLED') {
      throw new ConflictException(
        'You already have an active registration for this event',
      );
    }

    // 2. Fetch event
    const event = await this.eventModel.findByPk(eventId, {
      include: [{ model: Category, attributes: ['id', 'name', 'slug'] }],
    });

    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (event.status !== 'PUBLISHED') {
      throw new BadRequestException(
        'Cannot register for an event that is not published',
      );
    }

    // Generate ticket code: e.g. TKT-A1B2C3D4
    const ticketCode = `TKT-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // 3. Atomically check capacity and create registration within transaction
    let registration: Registration;
    await this.sequelize.transaction(async (t) => {
      // Re-fetch event with row lock
      const lockedEvent = await this.eventModel.findByPk(eventId, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!lockedEvent) {
        throw new NotFoundException('Event not found');
      }

      const isWaitlist = lockedEvent.registeredCount >= lockedEvent.capacity;
      const status = isWaitlist ? 'WAITLISTED' : 'CONFIRMED';

      if (existing) {
        // Reactivate previously cancelled registration
        await existing.update(
          {
            status,
            ticketCode,
            registeredAt: new Date(),
          },
          { transaction: t },
        );
        registration = existing;
      } else {
        registration = await this.registrationModel.create(
          {
            eventId,
            userId,
            status,
            ticketCode,
            registeredAt: new Date(),
          },
          { transaction: t },
        );
      }

      // Increment registered count if confirmed
      if (status === 'CONFIRMED') {
        await lockedEvent.increment('registeredCount', {
          by: 1,
          transaction: t,
        });
      }
    });

    // 4. Publish asynchronous message to RabbitMQ topic exchange
    const published = await this.rabbitmqService.publish(
      EXCHANGES.EVENTS,
      ROUTING_KEYS.REGISTRATION_CREATED,
      {
        registrationId: registration!.id,
        eventId,
        ownerId: event.createdById,
        eventTitle: event.title,
        userId,
        ticketCode: registration!.ticketCode,
        status: registration!.status,
        timestamp: new Date().toISOString(),
      },
    );

    // If real-time message broker is unavailable, persist notifications directly
    if (!published && this.notificationModel) {
      await this.notificationModel.create({
        userId,
        title: 'Registration Confirmed',
        message: `You are confirmed for "${event.title}". Your ticket code is ${registration!.ticketCode}.`,
        type: 'REGISTRATION',
        isRead: false,
        metadata: {
          eventId,
          registrationId: registration!.id,
          ticketCode: registration!.ticketCode,
        },
      });

      if (event.createdById) {
        await this.notificationModel.create({
          userId: event.createdById,
          title: 'New Event Registration',
          message: `A user has registered for ${event.title}.`,
          type: 'REGISTRATION',
          isRead: false,
          metadata: {
            eventId,
            registrationId: registration!.id,
            registrantId: userId,
            ticketCode: registration!.ticketCode,
          },
        });
      }
    }

    return this.registrationModel.findByPk(registration!.id, {
      include: [
        {
          model: Event,
          include: [{ model: Category, attributes: ['id', 'name', 'slug'] }],
        },
      ],
    }) as Promise<Registration>;
  }

  async getMyRegistrations(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedResult<Registration>> {
    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    const { count, rows } = await this.registrationModel.findAndCountAll({
      where: { userId },
      limit,
      offset,
      order: [['registered_at', 'DESC']],
      include: [
        {
          model: Event,
          include: [
            {
              model: Category,
              attributes: ['id', 'name', 'slug', 'icon'],
            },
          ],
        },
      ],
      distinct: true,
    });

    const totalPages = Math.ceil(count / limit) || 1;

    return {
      items: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  async cancelRegistration(
    id: string,
    userId: string,
    isAdmin = false,
  ): Promise<{ success: boolean; message: string }> {
    const registration = await this.registrationModel.findByPk(id);
    if (!registration) {
      throw new NotFoundException(`Registration with ID ${id} not found`);
    }

    if (!isAdmin && registration.userId !== userId) {
      throw new ForbiddenException(
        'You can only cancel your own registrations',
      );
    }

    if (registration.status === 'CANCELLED') {
      throw new BadRequestException('This registration is already cancelled');
    }

    const previousStatus = registration.status;

    // Atomically cancel and decrement attendee counter
    await this.sequelize.transaction(async (t) => {
      await registration.update({ status: 'CANCELLED' }, { transaction: t });

      if (previousStatus === 'CONFIRMED') {
        const event = await this.eventModel.findByPk(registration.eventId, {
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        if (event && event.registeredCount > 0) {
          await event.decrement('registeredCount', { by: 1, transaction: t });

          // Promote first waitlisted user if one exists
          const waitlisted = await this.registrationModel.findOne({
            where: {
              eventId: registration.eventId,
              status: 'WAITLISTED',
            },
            order: [['registered_at', 'ASC']],
            transaction: t,
          });

          if (waitlisted) {
            await waitlisted.update({ status: 'CONFIRMED' }, { transaction: t });
            await event.increment('registeredCount', { by: 1, transaction: t });
          }
        }
      }
    });

    // Publish cancellation message to RabbitMQ
    await this.rabbitmqService.publish(
      EXCHANGES.EVENTS,
      ROUTING_KEYS.REGISTRATION_CANCELLED,
      {
        registrationId: registration.id,
        eventId: registration.eventId,
        userId: registration.userId,
        timestamp: new Date().toISOString(),
      },
    );

    return { success: true, message: 'Registration cancelled successfully' };
  }

  async getEventAttendees(
    eventId: string,
    query: PaginationQueryDto,
    user?: RequestUser,
  ): Promise<PaginatedResult<Registration>> {
    const event = await this.eventModel.findByPk(eventId);
    if (!event) {
      throw new NotFoundException(`Event with ID ${eventId} not found`);
    }

    if (user) {
      const isSuperAdmin =
        user.role === 'SUPER_ADMIN' || (user.role as any) === 'PLATFORM_ADMIN';
      if (!isSuperAdmin && event.createdById !== user.id) {
        throw new ForbiddenException(
          'You are not authorized to view attendee registrations for this event',
        );
      }
    }

    const page = Number(query.page) || 1;
    const limit = Math.min(Number(query.limit) || 10, 100);
    const offset = (page - 1) * limit;

    const { count, rows } = await this.registrationModel.findAndCountAll({
      where: { eventId },
      limit,
      offset,
      order: [['registered_at', 'DESC']],
      include: [
        {
          model: User,
          attributes: ['id', 'fullName', 'email', 'createdAt'],
        },
      ],
      distinct: true,
    });

    const totalPages = Math.ceil(count / limit) || 1;

    return {
      items: rows,
      meta: {
        total: count,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }
}
