import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiPropertyOptional({ example: 'Technology & Cloud', description: 'Updated category name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({
    example: 'Updated description for tech and cloud events',
    description: 'Updated category description',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'cloud-icon', description: 'Updated icon identifier' })
  @IsOptional()
  @IsString()
  icon?: string;
}
