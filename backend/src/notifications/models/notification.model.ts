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
import { User } from '../../users/models/user.model';

export type NotificationType = 'REGISTRATION' | 'REMINDER' | 'EVENT_UPDATE';

@Table({
  tableName: 'notifications',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_notifications_user_read',
      fields: ['user_id', 'is_read'],
    },
  ],
})
export class Notification extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(false)
  @Column(DataType.UUID)
  userId!: string;

  @BelongsTo(() => User)
  user!: User;

  @AllowNull(false)
  @Column(DataType.STRING)
  title!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  message!: string;

  @AllowNull(false)
  @Default('REGISTRATION')
  @Column(DataType.ENUM('REGISTRATION', 'REMINDER', 'EVENT_UPDATE'))
  type!: NotificationType;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isRead!: boolean;

  @AllowNull(true)
  @Column(DataType.JSONB)
  metadata?: Record<string, any>;
}
