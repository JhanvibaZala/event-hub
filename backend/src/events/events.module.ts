import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Event } from './models/event.model';
import { Category } from '../categories/models/category.model';
import { EventsService } from './events.service';
import { EventsController } from './events.controller';
import { AdminEventsController } from './admin-events.controller';

@Module({
  imports: [SequelizeModule.forFeature([Event, Category])],
  controllers: [EventsController, AdminEventsController],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
