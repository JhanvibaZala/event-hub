import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Janvi Zala', description: 'User full name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  fullName?: string;
}
