import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Registration } from './models/registration.model';
import { Event } from '../events/models/event.model';
import { RegistrationsService } from './registrations.service';
import { RegistrationsController } from './registrations.controller';

@Module({
  imports: [SequelizeModule.forFeature([Registration, Event])],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
  exports: [RegistrationsService],
})
export class RegistrationsModule {}
