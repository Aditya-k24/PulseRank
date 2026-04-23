import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../db/redis';
import { PrismaService } from '../../db/prisma';
import type { LeaderboardEntry, LeaderboardWindow } from '@pulserank/shared';

const TOP_N = 50;

function getDailyKey(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `leaderboard:daily:${yyyy}-${mm}-${dd}`;
}

function getWeeklyKey(): string {
  const d = new Date();
  const year = d.getUTCFullYear();
  // ISO week number
  const startOfYear = new Date(Date.UTC(year, 0, 1));
  const diff = d.getTime() - startOfYear.getTime();
  const week = Math.ceil((diff / 86400000 + startOfYear.getUTCDay() + 1) / 7);
  return `leaderboard:weekly:${year}-${String(week).padStart(2, '0')}`;
}

@Injectable()
export class LeaderboardService {
  private readonly logger = new Logger(LeaderboardService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async getLeaderboard(window: LeaderboardWindow): Promise<LeaderboardEntry[]> {
    const key = this.resolveKey(window);

    const entries = await this.redis.zrevrangeWithScores(key, 0, TOP_N - 1);

    if (entries.length === 0) {
      return [];
    }

    // Batch-fetch usernames from MySQL
    const userIds = entries.map((e) => e.member);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });

    const usernameMap = new Map<string, string>(users.map((u) => [u.id, u.username]));

    return entries.map((entry, idx) => ({
      rank: idx + 1,
      userId: entry.member,
      username: usernameMap.get(entry.member) ?? 'unknown',
      score: entry.score,
    }));
  }

  resolveKey(window: LeaderboardWindow): string {
    switch (window) {
      case 'global':
        return 'leaderboard:global';
      case 'daily':
        return getDailyKey();
      case 'weekly':
        return getWeeklyKey();
      default: {
        const _exhaustive: never = window;
        return _exhaustive;
      }
    }
  }
}
