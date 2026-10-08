import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  AllowNull,
  HasMany,
  DefaultScope,
  Scopes,
} from 'sequelize-typescript';
import { Event } from '../../events/models/event.model';
import { Registration } from '../../registrations/models/registration.model';
import { Notification } from '../../notifications/models/notification.model';
import { OtpCode } from '../../auth/models/otp-code.model';

export type UserRole = 'USER' | 'ADMIN';

@DefaultScope(() => ({
  attributes: { exclude: ['password'] },
}))
@Scopes(() => ({
  withPassword: {
    attributes: { include: ['password'] },
  },
}))
@Table({
  tableName: 'users',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_users_email',
      unique: true,
      fields: ['email'],
    },
    {
      name: 'idx_users_role',
      fields: ['role'],
    },
  ],
})
export class User extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  email!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  password!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  fullName!: string;

  @AllowNull(false)
  @Default('USER')
  @Column(DataType.ENUM('USER', 'ADMIN'))
  role!: UserRole;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isVerified!: boolean;

  @HasMany(() => Event, 'createdById')
  createdEvents!: Event[];

  @HasMany(() => Registration)
  registrations!: Registration[];

  @HasMany(() => Notification)
  notifications!: Notification[];

  @HasMany(() => OtpCode)
  otpCodes!: OtpCode[];
}
