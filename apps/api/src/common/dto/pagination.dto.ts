import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Cursor for pagination',
    example: 'eyJpZCI6ImNscXh5ejEyMzQ1Njc4OTAifQ==',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({
    description: 'Number of items to return',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

export class PaginationResponseDto<T> {
  data: T[];
  meta: {
    has_next: boolean;
    next_cursor?: string;
    total_count?: number;
  };

  constructor(data: T[], hasNext: boolean, nextCursor?: string, totalCount?: number) {
    this.data = data;
    this.meta = {
      has_next: hasNext,
      next_cursor: nextCursor,
      total_count: totalCount,
    };
  }
}