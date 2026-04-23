import { Controller, Get, Query } from '@nestjs/common';
import { IsInt, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { FeedService } from './feed.service';
import type { FeedEntry, ApiResponse } from '@pulserank/shared';

class FeedQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  async getFeed(@Query() query: FeedQueryDto): Promise<ApiResponse<FeedEntry[]>> {
    return this.feedService.getFeed(query.page ?? 1, query.limit ?? 20);
  }
}
