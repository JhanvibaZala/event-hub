import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  Unique,
  AllowNull,
  ForeignKey,
  BelongsTo,
  HasMany,
} from 'sequelize-typescript';
import { Category } from '../../categories/models/category.model';
import { User } from '../../users/models/user.model';
import { Registration } from '../../registrations/models/registration.model';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED';

@Table({
  tableName: 'events',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_events_status_start_date',
      fields: ['status', 'start_date'],
    },
    {
      name: 'idx_events_category_id',
      fields: ['category_id'],
    },
    {
      name: 'idx_events_created_by_id',
      fields: ['created_by_id'],
    },
  ],
})
export class Event extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  title!: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  slug!: string;

  @AllowNull(false)
  @Column(DataType.TEXT)
  description!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  location!: string;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isOnline!: boolean;

  @AllowNull(false)
  @Column(DataType.DATE)
  startDate!: Date;

  @AllowNull(false)
  @Column(DataType.DATE)
  endDate!: Date;

  @AllowNull(false)
  @Column(DataType.INTEGER)
  capacity!: number;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.INTEGER)
  registeredCount!: number;

  @AllowNull(false)
  @Default(0.0)
  @Column(DataType.DECIMAL(10, 2))
  price!: number;

  @AllowNull(false)
  @Default('DRAFT')
  @Column(DataType.ENUM('DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'))
  status!: EventStatus;

  @ForeignKey(() => Category)
  @AllowNull(false)
  @Column(DataType.UUID)
  categoryId!: string;

  @BelongsTo(() => Category)
  category!: Category;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.UUID)
  createdById?: string;

  @BelongsTo(() => User, 'createdById')
  organizer?: User;

  @HasMany(() => Registration)
  registrations!: Registration[];
}
