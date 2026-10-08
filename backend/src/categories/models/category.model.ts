import {
  Table,
  Column,
  Model,
  DataType,
  PrimaryKey,
  Default,
  Unique,
  AllowNull,
  HasMany,
} from 'sequelize-typescript';
import { Event } from '../../events/models/event.model';

@Table({
  tableName: 'categories',
  timestamps: true,
  underscored: true,
})
export class Category extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  name!: string;

  @Unique
  @AllowNull(false)
  @Column(DataType.STRING)
  slug!: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description?: string;

  @AllowNull(true)
  @Column(DataType.STRING)
  icon?: string;

  @HasMany(() => Event)
  events!: Event[];
}
