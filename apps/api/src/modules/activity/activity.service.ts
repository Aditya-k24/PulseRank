import {
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../db/prisma';
import { ActivityType, SCORE_WEIGHTS } from '@pulserank/shared';
import type { ActivityEvent } from '@prisma/client';

export interface RecordActivityDto {
  userId: string;
  type: ActivityType;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordActivity(dto: RecordActivityDto, idempotencyKey: string): Promise<ActivityEvent> {
    const points = SCORE_WEIGHTS[dto.type];

    if (points === undefined) {
      throw new BadRequestException(`Unknown activity type: ${dto.type}`);
    }

    try {
      const [event] = await this.prisma.$transaction(async (tx) => {
        // Check idempotency — throws P2002 on duplicate key
        await tx.idempotencyKey.create({ data: { key: idempotencyKey } });

        // Record the canonical activity event
        const activityEvent = await tx.activityEvent.create({
          data: {
            userId: dto.userId,
            type: dto.type,
            points,
            metadata: dto.metadata ?? {},
          },
        });

        // Upsert the user's cumulative score
        await tx.userScore.upsert({
          where: { userId: dto.userId },
          update: { score: { increment: points } },
          create: { userId: dto.userId, score: points },
        });

        // Write the outbox event for async projection
        await tx.outboxEvent.create({
          data: {
            aggregateType: 'User',
            aggregateId: dto.userId,
            eventType: dto.type,
            payload: {
              eventId: activityEvent.id,
              userId: dto.userId,
              type: dto.type,
              points,
              metadata: dto.metadata ?? {},
            },
          },
        });

        return [activityEvent];
      });

      return event;
    } catch (err: unknown) {
      // Prisma unique constraint violation code
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: string }).code === 'P2002'
      ) {
        this.logger.warn(`Duplicate idempotency key: ${idempotencyKey}`);
        throw new ConflictException('Duplicate request — idempotency key already used');
      }
      throw err;
    }
  }

  async getEventById(eventId: string): Promise<ActivityEvent | null> {
    return this.prisma.activityEvent.findUnique({ where: { id: eventId } });
  }
}
