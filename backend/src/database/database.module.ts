import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '../users/models/user.model';
import { OtpCode } from '../auth/models/otp-code.model';
import { Category } from '../categories/models/category.model';
import { Event } from '../events/models/event.model';
import { Registration } from '../registrations/models/registration.model';
import { Notification } from '../notifications/models/notification.model';

export const ALL_MODELS = [
  User,
  OtpCode,
  Category,
  Event,
  Registration,
  Notification,
];

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dialect: 'postgres',
        host: config.get<string>('DB_HOST', 'localhost'),
        port: config.get<number>('DB_PORT', 5432),
        username: config.get<string>('DB_USERNAME', 'janvi'),
        password: config.get<string>('DB_PASSWORD', 'your_password'),
        database: config.get<string>('DB_DATABASE', 'eventhub_db'),
        models: ALL_MODELS,
        autoLoadModels: true,
        synchronize: config.get<string>('DB_SYNC', 'true') === 'true',
        logging:
          config.get<string>('DB_LOGGING', 'false') === 'true'
            ? console.log
            : false,
      }),
    }),
    SequelizeModule.forFeature(ALL_MODELS),
  ],
  exports: [SequelizeModule],
})
export class DatabaseModule {}
