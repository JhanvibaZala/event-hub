import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { Event } from '../../events/models/event.model';
import { User } from '../../users/models/user.model';

export type RegistrationStatus = 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED';

@Table({
  tableName: 'registrations',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_unique_event_user_registration',
      unique: true,
      fields: ['event_id', 'user_id'],
    },
    {
      name: 'idx_registrations_ticket_code',
      unique: true,
      fields: ['ticket_code'],
    },
    {
      name: 'idx_registrations_status',
      fields: ['status'],
    },
  ],
})
export class Registration extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => Event)
  @AllowNull(false)
  @Column(DataType.UUID)
  eventId!: string;

  @BelongsTo(() => Event)
  event!: Event;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  userId!: string;

  @BelongsTo(() => User)
  user!: User;

  @AllowNull(false)
  @Default('CONFIRMED')
  @Column(DataType.ENUM('CONFIRMED', 'WAITLISTED', 'CANCELLED'))
  status!: RegistrationStatus;

  @AllowNull(false)
  @Column(DataType.STRING)
  ticketCode!: string;

  @AllowNull(false)
  @Default(DataType.NOW)
  @Column(DataType.DATE)
  registeredAt!: Date;
}
