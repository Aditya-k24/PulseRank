import { Module } from '@nestjs/common';
import { LeaderboardController } from './leaderboard.controller';
import { LeaderboardService } from './leaderboard.service';
import { RedisService } from '../../db/redis';
import { PrismaService } from '../../db/prisma';

@Module({
  controllers: [LeaderboardController],
  providers: [LeaderboardService, RedisService, PrismaService],
  exports: [LeaderboardService],
})
export class LeaderboardModule {}
