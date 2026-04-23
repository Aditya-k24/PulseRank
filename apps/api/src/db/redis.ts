import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis;

  async onModuleInit(): Promise<void> {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    this.client = new Redis(url, {
      lazyConnect: true,
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
    });

    this.client.on('error', (err: Error) => {
      this.logger.error(`Redis error: ${err.message}`);
    });

    await this.client.connect();
    this.logger.log('Connected to Redis');
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
    this.logger.log('Disconnected from Redis');
  }

  async zincrby(key: string, increment: number, member: string): Promise<void> {
    await this.client.zincrby(key, increment, member);
  }

  async zrevrangeWithScores(
    key: string,
    start: number,
    stop: number,
  ): Promise<Array<{ member: string; score: number }>> {
    const result = await this.client.zrevrange(key, start, stop, 'WITHSCORES');
    const entries: Array<{ member: string; score: number }> = [];

    for (let i = 0; i < result.length; i += 2) {
      entries.push({
        member: result[i],
        score: parseFloat(result[i + 1]),
      });
    }

    return entries;
  }

  async expireAt(key: string, timestamp: number): Promise<void> {
    await this.client.expireat(key, timestamp);
  }

  getClient(): Redis {
    return this.client;
  }
}
