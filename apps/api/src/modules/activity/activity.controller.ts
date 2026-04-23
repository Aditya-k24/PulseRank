import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ActivityType } from '@pulserank/shared';
import type { RecordActivityResponse } from '@pulserank/shared';
import type { ActivityEvent } from '@prisma/client';

class RecordActivityDto {
  @IsString()
  @IsNotEmpty()
  userId!: string;

  @IsEnum(ActivityType)
  type!: ActivityType;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

@Controller()
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post('events')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async recordActivity(
    @Body() dto: RecordActivityDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ): Promise<RecordActivityResponse> {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const event: ActivityEvent = await this.activityService.recordActivity(dto, idempotencyKey);

    return {
      id: event.id,
      userId: event.userId,
      type: event.type,
      points: event.points,
      metadata: event.metadata as Record<string, unknown>,
      createdAt: event.createdAt.toISOString(),
    };
  }
}
