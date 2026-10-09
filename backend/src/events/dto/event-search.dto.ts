import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidateNested,
  IsIn,
  IsUUID,
  IsBoolean,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { EventStatus } from '../models/event.model';
import { FilterGroup } from './filter-rule.dto';
import { SortRule, SortDirection } from './sort-rule.dto';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    default: 10,
    minimum: 1,
    maximum: 100,
    description: 'Number of items per page (max 100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Base64 encoded cursor for keyset pagination',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}

export class SortRuleItemDto {
  @ApiProperty({
    description: 'Sort field name (e.g. price, title, startDate, createdAt)',
    example: 'price',
  })
  @IsString()
  field!: string;

  @ApiProperty({
    enum: ['ASC', 'DESC', 'asc', 'desc'],
    default: 'ASC',
    description: 'Sort direction (ASC or DESC)',
    example: 'ASC',
  })
  @IsIn(['ASC', 'DESC', 'asc', 'desc'], {
    message: "Sort direction must be 'ASC' or 'DESC'",
  })
  direction!: SortDirection;
}

export class EventSearchDto {
  @ApiPropertyOptional({
    description: 'Keyword search across title, description, and location',
    example: 'AI Summit',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    type: PaginationDto,
    description: 'Pagination parameters (page, limit, cursor)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaginationDto)
  pagination?: PaginationDto;

  @ApiPropertyOptional({
    type: [SortRuleItemDto],
    description:
      'Ordered array of sort rules (applied in order, with deterministic id tie-breaker appended automatically)',
    example: [
      { field: 'price', direction: 'ASC' },
      { field: 'title', direction: 'ASC' },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SortRuleItemDto)
  sort?: SortRuleItemDto[];

  @ApiPropertyOptional({
    description:
      'Dynamic recursive filter group with AND/OR logic, rules, and nested groups',
    example: {
      logic: 'AND',
      rules: [{ field: 'price', operator: 'lte', value: 100 }],
      groups: [],
    },
  })
  @IsOptional()
  filters?: FilterGroup | string;

  // Direct convenience/fallback fields
  @ApiPropertyOptional({
    description: 'Fallback page number when pagination object is omitted',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Fallback limit when pagination object is omitted',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Fallback cursor when pagination object is omitted',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ description: 'Filter by category UUID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    enum: ['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'],
    description: 'Filter by event status',
  })
  @IsOptional()
  @IsIn(['DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'])
  status?: EventStatus;

  @ApiPropertyOptional({ description: 'Filter by virtual or in-person status' })
  @IsOptional()
  @IsBoolean()
  isOnline?: boolean;

  @ApiPropertyOptional({
    description: 'Filter events starting on or after this ISO date',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Filter events ending on or before this ISO date',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
