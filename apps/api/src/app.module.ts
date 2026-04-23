import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './db/prisma';
import { MongoService } from './db/mongo';
import { RedisService } from './db/redis';
import { AuthModule } from './modules/auth/auth.module';
import { ActivityModule } from './modules/activity/activity.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { FeedModule } from './modules/feed/feed.module';
import { SseModule } from './modules/sse/sse.module';
import { WorkerModule } from './modules/worker/worker.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    AuthModule,
    ActivityModule,
    LeaderboardModule,
    FeedModule,
    SseModule,
    WorkerModule,
  ],
  providers: [PrismaService, MongoService, RedisService],
  exports: [PrismaService, MongoService, RedisService],
})
export class AppModule {}
