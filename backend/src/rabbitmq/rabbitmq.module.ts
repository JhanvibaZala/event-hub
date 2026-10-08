import { Module, Global } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { RabbitmqService } from './rabbitmq.service';
import { Event } from '../events/models/event.model';
import { Notification } from '../notifications/models/notification.model';

@Global()
@Module({
  imports: [SequelizeModule.forFeature([Event, Notification])],
  providers: [RabbitmqService],
  exports: [RabbitmqService],
})
export class RabbitmqModule {}
