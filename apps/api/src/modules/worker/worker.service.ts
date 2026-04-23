import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaService } from '../../db/prisma';
import { MongoService } from '../../db/mongo';
import { RedisService } from '../../db/redis';
import { SseService } from '../sse/sse.service';
import { LeaderboardService } from '../leaderboard/leaderboard.service';

interface OutboxPayload {
  eventId: string;
  userId: string;
  username?: string;
  type: string;
  points: number;
  metadata: Record<string, unknown>;
}

const POLL_INTERVAL_MS = 1000;
const BATCH_SIZE = 100;

@Injectable()
export class WorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WorkerService.name);
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mongo: MongoService,
    private readonly redis: RedisService,
    private readonly sse: SseService,
    private readonly leaderboard: LeaderboardService,
  ) {}

  onModuleInit(): void {
    this.timer = setInterval(() => {
      void this.processOutbox();
    }, POLL_INTERVAL_MS);
    this.logger.log('Outbox worker started');
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.logger.log('Outbox worker stopped');
  }

  private async processOutbox(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const events = await this.prisma.outboxEvent.findMany({
        where: { processedAt: null },
        orderBy: { createdAt: 'asc' },
        take: BATCH_SIZE,
        include: {
          // We need username; join through aggregateId -> User
        },
      });

      if (events.length === 0) {
        return;
      }

      // Batch-fetch usernames for all user IDs in this batch
      const userIds = [...new Set(events.map((e) => e.aggregateId))];
      const users = await this.prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, username: true },
      });
      const usernameMap = new Map<string, string>(users.map((u) => [u.id, u.username]));

      for (const event of events) {
        const payload = event.payload as OutboxPayload;
        const username = usernameMap.get(event.aggregateId) ?? 'unknown';

        await this.projectToRedis(event.aggregateId, payload.points, event.createdAt);
        await this.projectToMongo({ ...payload, username }, event.createdAt);
        await this.prisma.outboxEvent.update({
          where: { id: event.id },
          data: { processedAt: new Date() },
        });
      }

      // After projection, broadcast top-10 to SSE clients (only if any clients connected)
      if (this.sse.getClientCount() > 0) {
        const top10 = await this.leaderboard.getLeaderboard('global');
        this.sse.broadcast({
          type: 'leaderboard_update',
          data: top10.slice(0, 10),
        });
      }
    } catch (err) {
      this.logger.error('Outbox processing error:', err);
    } finally {
      this.running = false;
    }
  }

  private async projectToRedis(
    userId: string,
    points: number,
    createdAt: Date,
  ): Promise<void> {
    const globalKey = 'leaderboard:global';

    const yyyy = createdAt.getUTCFullYear();
    const mm = String(createdAt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(createdAt.getUTCDate()).padStart(2, '0');
    const dailyKey = `leaderboard:daily:${yyyy}-${mm}-${dd}`;

    const week = this.getIsoWeek(createdAt);
    const weeklyKey = `leaderboard:weekly:${yyyy}-${String(week).padStart(2, '0')}`;

    await Promise.all([
      this.redis.zincrby(globalKey, points, userId),
      this.redis.zincrby(dailyKey, points, userId),
      this.redis.zincrby(weeklyKey, points, userId),
    ]);
  }

  private async projectToMongo(
    payload: OutboxPayload & { username: string },
    createdAt: Date,
  ): Promise<void> {
    try {
      await this.mongo.feedEvents.insertOne({
        eventId: payload.eventId,
        userId: payload.userId,
        username: payload.username,
        type: payload.type,
        points: payload.points,
        metadata: payload.metadata,
        createdAt,
      });
    } catch (err: unknown) {
      // Duplicate key — event already projected (idempotent)
      if (
        err instanceof Error &&
        'code' in err &&
        (err as { code: number }).code === 11000
      ) {
        this.logger.debug(`Skipping duplicate feed event: ${payload.eventId}`);
        return;
      }
      throw err;
    }
  }

  private getIsoWeek(date: Date): number {
    const startOfYear = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const diff = date.getTime() - startOfYear.getTime();
    return Math.ceil((diff / 86400000 + startOfYear.getUTCDay() + 1) / 7);
  }
}
