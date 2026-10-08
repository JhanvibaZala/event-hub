import {
  IsString,
  MinLength,
  IsBoolean,
  IsOptional,
  IsDate,
  IsInt,
  Min,
  IsNumber,
  IsUUID,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus } from '../models/event.model';

export class CreateEventDto {
  @ApiProperty({ example: 'Global AI & Cloud Summit 2026', description: 'Event title' })
  @IsString()
  @MinLength(3)
  title!: string;

  @ApiProperty({
    example: 'An international conference gathering tech innovators, engineers, and AI pioneers.',
    description: 'Detailed description of the event',
  })
  @IsString()
  @MinLength(10)
  description!: string;

  @ApiProperty({ example: 'Convention Center, San Francisco, CA', description: 'Venue or online platform URL' })
  @IsString()
  @MinLength(2)
  location!: string;

  @ApiPropertyOptional({ example: false, default: false, description: 'Whether event is virtual/online' })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean = false;

  @ApiProperty({ example: '2026-11-15T09:00:00.000Z', description: 'Event start datetime' })
  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @ApiProperty({ example: '2026-11-16T18:00:00.000Z', description: 'Event end datetime' })
  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @ApiProperty({ example: 250, description: 'Maximum seating capacity' })
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiPropertyOptional({ example: 49.99, default: 0, description: 'Ticket price' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number = 0;

  @ApiProperty({ example: 'uuid-of-category', description: 'Associated category UUID' })
  @IsUUID()
  categoryId!: string;

  @ApiPropertyOptional({
    enum: ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'],
    default: 'PUBLISHED',
    description: 'Initial event publication status',
  })
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'])
  status?: EventStatus = 'PUBLISHED';
}
