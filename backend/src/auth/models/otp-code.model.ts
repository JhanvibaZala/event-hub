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

export type OtpType = 'REGISTER' | 'RESET_PASSWORD';

@Table({
  tableName: 'otp_codes',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_otp_codes_email',
      fields: ['email'],
    },
    {
      name: 'idx_otp_codes_lookup',
      fields: ['email', 'type', 'is_used'],
    },
  ],
})
export class OtpCode extends Model {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  id!: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column(DataType.UUID)
  userId?: string;

  @BelongsTo(() => User)
  user?: User;

  @AllowNull(false)
  @Column(DataType.STRING)
  email!: string;

  @AllowNull(false)
  @Column(DataType.STRING(6))
  code!: string;

  @AllowNull(false)
  @Column(DataType.ENUM('REGISTER', 'RESET_PASSWORD'))
  type!: OtpType;

  @AllowNull(false)
  @Column(DataType.DATE)
  expiresAt!: Date;

  @AllowNull(false)
  @Default(false)
  @Column(DataType.BOOLEAN)
  isUsed!: boolean;
}
