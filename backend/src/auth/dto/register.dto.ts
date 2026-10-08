import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsIn,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'User email address' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'SecureP@ss123', description: 'Account password (min 6 characters)' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Janvi Zala', description: 'Full name' })
  @IsString()
  @MinLength(2)
  fullName!: string;

  @ApiPropertyOptional({ enum: ['USER', 'ADMIN'], default: 'USER', description: 'User role' })
  @IsOptional()
  @IsIn(['USER', 'ADMIN'])
  role?: 'USER' | 'ADMIN' = 'USER';
}
