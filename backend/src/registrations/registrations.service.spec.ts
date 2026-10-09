import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/sequelize';
import { RegistrationsService } from './registrations.service';
import { Registration } from './models/registration.model';
import { Event } from '../events/models/event.model';
import { Sequelize } from 'sequelize-typescript';
import { RabbitmqService, EXCHANGES, ROUTING_KEYS } from '../rabbitmq/rabbitmq.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { RequestUser } from '../common/decorators/current-user.decorator';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { User } from '../users/models/user.model';

import { Notification } from '../notifications/models/notification.model';

describe('RegistrationsService', () => {
  let service: RegistrationsService;
  let registrationModel: {
    findAndCountAll: jest.Mock;
    findOne: jest.Mock;
    findByPk: jest.Mock;
    create: jest.Mock;
  };
  let eventModel: {
    findByPk: jest.Mock;
  };
  let notificationModel: {
    create: jest.Mock;
    findAll: jest.Mock;
  };
  let rabbitmqService: {
    publish: jest.Mock;
  };
  let sequelize: {
    transaction: jest.Mock;
  };

  const adminUserA: RequestUser = {
    id: 'admin-a-id',
    email: 'adminA@example.com',
    role: 'ADMIN',
  };

  const adminUserB: RequestUser = {
    id: 'admin-b-id',
    email: 'adminB@example.com',
    role: 'ADMIN',
  };

  const superAdminUser: RequestUser = {
    id: 'super-admin-id',
    email: 'superadmin@example.com',
    role: 'SUPER_ADMIN',
  };

  beforeEach(async () => {
    registrationModel = {
      findAndCountAll: jest.fn(),
      findOne: jest.fn(),
      findByPk: jest.fn(),
      create: jest.fn(),
    };
    eventModel = {
      findByPk: jest.fn(),
    };
    notificationModel = {
      create: jest.fn(),
      findAll: jest.fn(),
    };
    rabbitmqService = {
      publish: jest.fn(),
    };
    sequelize = {
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RegistrationsService,
        {
          provide: getModelToken(Registration),
          useValue: registrationModel,
        },
        {
          provide: getModelToken(Event),
          useValue: eventModel,
        },
        {
          provide: getModelToken(Notification),
          useValue: notificationModel,
        },
        {
          provide: Sequelize,
          useValue: sequelize,
        },
        {
          provide: RabbitmqService,
          useValue: rabbitmqService,
        },
      ],
    }).compile();

    service = module.get<RegistrationsService>(RegistrationsService);
  });

  describe('getEventAttendees (Ownership Isolation)', () => {
    const mockEventA = {
      id: 'ev-1',
      title: 'Event by Admin A',
      createdById: 'admin-a-id',
    };

    const mockAttendeeList = [
      {
        id: 'reg-1',
        eventId: 'ev-1',
        userId: 'user-1',
        status: 'CONFIRMED',
        ticketCode: 'TKT-1111',
        registeredAt: new Date(),
        user: {
          id: 'user-1',
          fullName: 'Attendee One',
          email: 'one@example.com',
          createdAt: new Date(),
        },
      },
    ];

    it('should return attendee roster when requested by event owner', async () => {
      eventModel.findByPk.mockResolvedValue(mockEventA);
      registrationModel.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: mockAttendeeList,
      });

      const query = new PaginationQueryDto();
      const result = await service.getEventAttendees('ev-1', query, adminUserA);

      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(registrationModel.findAndCountAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { eventId: 'ev-1' },
          include: [
            expect.objectContaining({
              model: User,
              attributes: ['id', 'fullName', 'email', 'createdAt'],
            }),
          ],
        }),
      );
    });

    it('should throw ForbiddenException when requested by another admin who does not own the event', async () => {
      eventModel.findByPk.mockResolvedValue(mockEventA);

      const query = new PaginationQueryDto();
      await expect(
        service.getEventAttendees('ev-1', query, adminUserB),
      ).rejects.toThrow(ForbiddenException);

      expect(registrationModel.findAndCountAll).not.toHaveBeenCalled();
    });

    it('should return attendee roster when requested by SUPER_ADMIN even if not the creator', async () => {
      eventModel.findByPk.mockResolvedValue(mockEventA);
      registrationModel.findAndCountAll.mockResolvedValue({
        count: 1,
        rows: mockAttendeeList,
      });

      const query = new PaginationQueryDto();
      const result = await service.getEventAttendees('ev-1', query, superAdminUser);

      expect(result.items).toHaveLength(1);
      expect(registrationModel.findAndCountAll).toHaveBeenCalled();
    });

    it('should throw NotFoundException when the event does not exist', async () => {
      eventModel.findByPk.mockResolvedValue(null);

      const query = new PaginationQueryDto();
      await expect(
        service.getEventAttendees('missing-ev', query, adminUserA),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('register & Event Owner Notifications', () => {
    const mockEvent = {
      id: 'ev-100',
      title: 'React & TypeScript Masterclass',
      createdById: 'admin-owner-id',
      status: 'PUBLISHED',
      registeredCount: 5,
      capacity: 50,
      increment: jest.fn().mockResolvedValue(true),
    };

    const mockCreatedRegistration = {
      id: 'reg-new-1',
      eventId: 'ev-100',
      userId: 'attendee-1',
      status: 'CONFIRMED',
      ticketCode: 'TKT-TEST1234',
      registeredAt: new Date(),
    };

    beforeEach(() => {
      sequelize.transaction.mockImplementation(async (callback: any) => {
        return callback({ LOCK: { UPDATE: 'UPDATE' } });
      });
    });

    it('should notify the event owner and attendee upon successful registration via message broker', async () => {
      registrationModel.findOne.mockResolvedValue(null);
      eventModel.findByPk.mockResolvedValue(mockEvent);
      registrationModel.create.mockResolvedValue(mockCreatedRegistration);
      rabbitmqService.publish.mockResolvedValue(true);

      await service.register('ev-100', 'attendee-1');

      expect(rabbitmqService.publish).toHaveBeenCalledWith(
        EXCHANGES.EVENTS,
        ROUTING_KEYS.REGISTRATION_CREATED,
        expect.objectContaining({
          registrationId: 'reg-new-1',
          eventId: 'ev-100',
          ownerId: 'admin-owner-id',
          eventTitle: 'React & TypeScript Masterclass',
          userId: 'attendee-1',
        }),
      );
    });

    it('should directly persist notification for event owner if broker is unavailable (fallback)', async () => {
      registrationModel.findOne.mockResolvedValue(null);
      eventModel.findByPk.mockResolvedValue(mockEvent);
      registrationModel.create.mockResolvedValue(mockCreatedRegistration);
      rabbitmqService.publish.mockResolvedValue(false); // broker offline
      notificationModel.create.mockResolvedValue({});

      await service.register('ev-100', 'attendee-1');

      // Verified notification persisted for event owner
      expect(notificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-owner-id',
          title: 'New Event Registration',
          message: 'A user has registered for React & TypeScript Masterclass.',
          type: 'REGISTRATION',
          isRead: false,
          metadata: expect.objectContaining({
            eventId: 'ev-100',
            registrationId: 'reg-new-1',
            registrantId: 'attendee-1',
          }),
        }),
      );

      // Verified notification persisted for attendee
      expect(notificationModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'attendee-1',
          title: 'Registration Confirmed',
          isRead: false,
        }),
      );
    });

    it('should NOT generate any notification if registration fails due to duplicate active registration', async () => {
      registrationModel.findOne.mockResolvedValue({
        id: 'reg-existing',
        status: 'CONFIRMED',
      });
      eventModel.findByPk.mockResolvedValue(mockEvent);

      await expect(
        service.register('ev-100', 'attendee-1'),
      ).rejects.toThrow();

      expect(rabbitmqService.publish).not.toHaveBeenCalled();
      expect(notificationModel.create).not.toHaveBeenCalled();
    });

    it('should NOT generate any notification if transaction fails and rolls back', async () => {
      registrationModel.findOne.mockResolvedValue(null);
      eventModel.findByPk.mockResolvedValue(mockEvent);
      sequelize.transaction.mockRejectedValue(new Error('DB transaction error'));

      await expect(
        service.register('ev-100', 'attendee-1'),
      ).rejects.toThrow('DB transaction error');

      expect(rabbitmqService.publish).not.toHaveBeenCalled();
      expect(notificationModel.create).not.toHaveBeenCalled();
    });
  });
});
