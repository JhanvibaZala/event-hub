import {
  IsOptional,
  IsUUID,
  IsIn,
  IsBoolean,
  IsDateString,
  IsString,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { EventStatus } from '../models/event.model';

export class EventQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter by category UUID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    enum: ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'],
    description: 'Filter by event status (Defaults to PUBLISHED for public queries)',
  })
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'])
  status?: EventStatus;

  @ApiPropertyOptional({ description: 'Filter by virtual or in-person status' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional({ description: 'Filter events starting on or after this ISO date' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter events ending on or before this ISO date' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Base64 keyset pagination cursor' })
  @IsOptional()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Multi-sorting rules (e.g. startDate:ASC,price:DESC or JSON array)',
  })
  @IsOptional()
  sort?: string;

  @ApiPropertyOptional({
    description:
      'Advanced dynamic multi-filter group in JSON string format with AND/OR logic and rules',
  })
  @IsOptional()
  @IsString()
  filters?: string;
}
