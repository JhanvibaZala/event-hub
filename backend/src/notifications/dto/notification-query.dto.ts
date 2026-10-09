import { IsOptional, IsBoolean, IsString, IsIn } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

export class NotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter unread only', type: Boolean })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === 1 || value === '1') return true;
    if (value === 'false' || value === false || value === 0 || value === '0') return false;
    return value;
  })
  @IsBoolean()
  unreadOnly?: boolean;

  @ApiPropertyOptional({ description: 'Filter read only', type: Boolean })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === 1 || value === '1') return true;
    if (value === 'false' || value === false || value === 0 || value === '0') return false;
    return value;
  })
  @IsBoolean()
  readOnly?: boolean;

  @ApiPropertyOptional({ description: 'Direct boolean filter on read status', type: Boolean })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true || value === 1 || value === '1') return true;
    if (value === 'false' || value === false || value === 0 || value === '0') return false;
    return value;
  })
  @IsBoolean()
  isRead?: boolean;

  @ApiPropertyOptional({ description: 'Filter mode', enum: ['all', 'unread', 'read'] })
  @IsOptional()
  @IsString()
  @IsIn(['all', 'unread', 'read'])
  filter?: 'all' | 'unread' | 'read';

  @ApiPropertyOptional({ description: 'Status filter mode', enum: ['all', 'unread', 'read'] })
  @IsOptional()
  @IsString()
  @IsIn(['all', 'unread', 'read'])
  status?: 'all' | 'unread' | 'read';
}
