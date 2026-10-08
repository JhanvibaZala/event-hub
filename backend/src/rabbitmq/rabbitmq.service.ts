import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import * as amqp from 'amqplib';
import { Event } from '../events/models/event.model';
import { Notification } from '../notifications/models/notification.model';
import { Registration } from '../registrations/models/registration.model';

export const EXCHANGES = {
  EVENTS: 'eventhub.events',
  NOTIFICATIONS: 'eventhub.notifications',
};

export const QUEUES = {
  REGISTRATION_PROCESSING: 'q.registration.processing',
  REGISTRATION_CANCELLATION: 'q.registration.cancellation',
  NOTIFICATION_INBOX: 'q.notification.inbox',
  EVENT_BROADCAST: 'q.event.broadcast',
};

export const ROUTING_KEYS = {
  REGISTRATION_CREATED: 'registration.created',
  REGISTRATION_CANCELLED: 'registration.cancelled',
  NOTIFICATION_DISPATCH: 'notification.dispatch',
  EVENT_UPDATED: 'event.updated',
};

@Injectable()
export class RabbitmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitmqService.name);
  private connection: any = null;
  private channel: any = null;

  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Event)
    private readonly eventModel: typeof Event,
    @InjectModel(Notification)
    private readonly notificationModel: typeof Notification,
  ) {}

  async onModuleInit() {
    await this.initRabbitMQ();
  }

  async onModuleDestroy() {
    await this.closeConnection();
  }

  private async initRabbitMQ() {
    const uri = this.configService.get<string>(
      'RABBITMQ_URI',
      'amqp://guest:guest@localhost:5672',
    );

    try {
      this.connection = await amqp.connect(uri);
      this.channel = await this.connection.createChannel();

      this.logger.log('Connected to RabbitMQ server successfully');

      // 1. Declare Exchanges
      await this.channel.assertExchange(EXCHANGES.EVENTS, 'topic', {
        durable: true,
      });
      await this.channel.assertExchange(EXCHANGES.NOTIFICATIONS, 'direct', {
        durable: true,
      });

      // 2. Declare Queues
      await this.channel.assertQueue(QUEUES.REGISTRATION_PROCESSING, {
        durable: true,
      });
      await this.channel.assertQueue(QUEUES.REGISTRATION_CANCELLATION, {
        durable: true,
      });
      await this.channel.assertQueue(QUEUES.NOTIFICATION_INBOX, {
        durable: true,
      });
      await this.channel.assertQueue(QUEUES.EVENT_BROADCAST, {
        durable: true,
      });

      // 3. Bind Queues to Exchanges
      await this.channel.bindQueue(
        QUEUES.REGISTRATION_PROCESSING,
        EXCHANGES.EVENTS,
        ROUTING_KEYS.REGISTRATION_CREATED,
      );
      await this.channel.bindQueue(
        QUEUES.REGISTRATION_CANCELLATION,
        EXCHANGES.EVENTS,
        ROUTING_KEYS.REGISTRATION_CANCELLED,
      );
      await this.channel.bindQueue(
        QUEUES.NOTIFICATION_INBOX,
        EXCHANGES.NOTIFICATIONS,
        ROUTING_KEYS.NOTIFICATION_DISPATCH,
      );
      await this.channel.bindQueue(
        QUEUES.EVENT_BROADCAST,
        EXCHANGES.EVENTS,
        ROUTING_KEYS.EVENT_UPDATED,
      );

      // 4. Start Consumers
      await this.startConsumers();
    } catch (error: any) {
      this.logger.error(`Failed to initialize RabbitMQ: ${error.message}`);
    }
  }

  async publish(exchange: string, routingKey: string, message: any) {
    if (!this.channel) {
      this.logger.warn(
        `Channel not available, could not publish to ${exchange} with key ${routingKey}`,
      );
      return false;
    }

    const payload = Buffer.from(JSON.stringify(message));
    return this.channel.publish(exchange, routingKey, payload, {
      persistent: true,
      contentType: 'application/json',
      timestamp: Date.now(),
    });
  }

  private async startConsumers() {
    if (!this.channel) return;

    // Consumer 1: Registration Processing
    await this.channel.consume(
      QUEUES.REGISTRATION_PROCESSING,
      async (msg) => {
        if (!msg) return;
        try {
          const data = JSON.parse(msg.content.toString());
          this.logger.log(
            `[Worker] Processing registration: ${data.registrationId} for event: ${data.eventId}`,
          );

          // Find event details for confirmation notification
          const event = await this.eventModel.findByPk(data.eventId);
          if (event) {
            // Dispatch notification to user's inbox via direct exchange
            await this.publish(
              EXCHANGES.NOTIFICATIONS,
              ROUTING_KEYS.NOTIFICATION_DISPATCH,
              {
                userId: data.userId,
                title: 'Registration Confirmed 🎉',
                message: `You are confirmed for "${event.title}". Your ticket code is ${data.ticketCode}.`,
                type: 'REGISTRATION',
                metadata: {
                  eventId: event.id,
                  registrationId: data.registrationId,
                  ticketCode: data.ticketCode,
                },
              },
            );
          }

          this.channel?.ack(msg);
        } catch (err: any) {
          this.logger.error(
            `[Worker] Error processing registration message: ${err.message}`,
          );
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false },
    );

    // Consumer 2: Registration Cancellation
    await this.channel.consume(
      QUEUES.REGISTRATION_CANCELLATION,
      async (msg) => {
        if (!msg) return;
        try {
          const data = JSON.parse(msg.content.toString());
          this.logger.log(
            `[Worker] Processing cancellation for registration: ${data.registrationId}`,
          );

          const event = await this.eventModel.findByPk(data.eventId);
          if (event) {
            // Dispatch cancellation notice
            await this.publish(
              EXCHANGES.NOTIFICATIONS,
              ROUTING_KEYS.NOTIFICATION_DISPATCH,
              {
                userId: data.userId,
                title: 'Registration Cancelled',
                message: `Your registration for "${event.title}" has been cancelled.`,
                type: 'REGISTRATION',
                metadata: {
                  eventId: event.id,
                  registrationId: data.registrationId,
                },
              },
            );
          }

          this.channel?.ack(msg);
        } catch (err: any) {
          this.logger.error(
            `[Worker] Error processing cancellation message: ${err.message}`,
          );
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false },
    );

    // Consumer 3: Notification Dispatch (Persists to database)
    await this.channel.consume(
      QUEUES.NOTIFICATION_INBOX,
      async (msg) => {
        if (!msg) return;
        try {
          const data = JSON.parse(msg.content.toString());
          this.logger.log(
            `[Worker] Dispatching in-app notification to user: ${data.userId}`,
          );

          await this.notificationModel.create({
            userId: data.userId,
            title: data.title,
            message: data.message,
            type: data.type || 'REGISTRATION',
            isRead: false,
            metadata: data.metadata || null,
          });

          this.channel?.ack(msg);
        } catch (err: any) {
          this.logger.error(
            `[Worker] Error persisting notification: ${err.message}`,
          );
          this.channel?.nack(msg, false, false);
        }
      },
      { noAck: false },
    );

    this.logger.log('All RabbitMQ background queue consumers started.');
  }

  private async closeConnection() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      this.logger.log('RabbitMQ connection closed cleanly');
    } catch (err: any) {
      this.logger.warn(`Error closing RabbitMQ connection: ${err.message}`);
    }
  }
}
