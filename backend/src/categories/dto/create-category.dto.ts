import { IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Technology & AI', description: 'Category name' })
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiPropertyOptional({
    example: 'Conferences, workshops, and meetups about technology and artificial intelligence',
    description: 'Detailed description of the category',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: 'cpu-chip',
    description: 'Icon identifier or SVG name',
  })
  @IsOptional()
  @IsString()
  icon?: string;
}
