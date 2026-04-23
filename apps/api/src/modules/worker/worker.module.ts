import { Module } from '@nestjs/common';
import { WorkerService } from './worker.service';
import { PrismaService } from '../../db/prisma';
import { MongoService } from '../../db/mongo';
import { RedisService } from '../../db/redis';
import { SseModule } from '../sse/sse.module';
import { LeaderboardModule } from '../leaderboard/leaderboard.module';

@Module({
  imports: [SseModule, LeaderboardModule],
  providers: [WorkerService, PrismaService, MongoService, RedisService],
})
export class WorkerModule {}
