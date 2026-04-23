import { Test, TestingModule } from '@nestjs/testing';
import { LeaderboardService } from './leaderboard.service';
import { RedisService } from '../../db/redis';
import { PrismaService } from '../../db/prisma';

const mockRedisService = {
  zrevrangeWithScores: jest.fn(),
};

const mockPrismaService = {
  user: {
    findMany: jest.fn(),
  },
};

describe('LeaderboardService', () => {
  let service: LeaderboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeaderboardService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LeaderboardService>(LeaderboardService);
    jest.clearAllMocks();
  });

  describe('getLeaderboard', () => {
    it('should return an empty array when Redis has no entries', async () => {
      mockRedisService.zrevrangeWithScores.mockResolvedValue([]);

      const result = await service.getLeaderboard('global');

      expect(result).toEqual([]);
      expect(mockPrismaService.user.findMany).not.toHaveBeenCalled();
    });

    it('should return ranked entries with usernames for global window', async () => {
      mockRedisService.zrevrangeWithScores.mockResolvedValue([
        { member: 'user-1', score: 100 },
        { member: 'user-2', score: 80 },
        { member: 'user-3', score: 60 },
      ]);

      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'user-1', username: 'alice' },
        { id: 'user-2', username: 'bob' },
        { id: 'user-3', username: 'carol' },
      ]);

      const result = await service.getLeaderboard('global');

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ rank: 1, userId: 'user-1', username: 'alice', score: 100 });
      expect(result[1]).toEqual({ rank: 2, userId: 'user-2', username: 'bob', score: 80 });
      expect(result[2]).toEqual({ rank: 3, userId: 'user-3', username: 'carol', score: 60 });
    });

    it('should use "unknown" for users not found in MySQL', async () => {
      mockRedisService.zrevrangeWithScores.mockResolvedValue([
        { member: 'user-deleted', score: 50 },
      ]);

      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.getLeaderboard('global');

      expect(result[0].username).toBe('unknown');
    });

    it('should use the correct Redis key for each window', async () => {
      mockRedisService.zrevrangeWithScores.mockResolvedValue([]);

      await service.getLeaderboard('global');
      expect(mockRedisService.zrevrangeWithScores).toHaveBeenCalledWith(
        'leaderboard:global',
        0,
        49,
      );

      jest.clearAllMocks();
      mockRedisService.zrevrangeWithScores.mockResolvedValue([]);

      await service.getLeaderboard('daily');
      const dailyCallKey = (mockRedisService.zrevrangeWithScores as jest.Mock).mock.calls[0][0] as string;
      expect(dailyCallKey).toMatch(/^leaderboard:daily:\d{4}-\d{2}-\d{2}$/);

      jest.clearAllMocks();
      mockRedisService.zrevrangeWithScores.mockResolvedValue([]);

      await service.getLeaderboard('weekly');
      const weeklyCallKey = (mockRedisService.zrevrangeWithScores as jest.Mock).mock.calls[0][0] as string;
      expect(weeklyCallKey).toMatch(/^leaderboard:weekly:\d{4}-\d{2}$/);
    });

    it('should only return the top 50 entries', async () => {
      // Verify the call passes correct range (0, 49) = 50 entries
      mockRedisService.zrevrangeWithScores.mockResolvedValue([]);

      await service.getLeaderboard('global');

      expect(mockRedisService.zrevrangeWithScores).toHaveBeenCalledWith(
        'leaderboard:global',
        0,
        49,
      );
    });
  });

  describe('resolveKey', () => {
    it('should return leaderboard:global for global window', () => {
      expect(service.resolveKey('global')).toBe('leaderboard:global');
    });

    it('should return a daily key matching the pattern', () => {
      const key = service.resolveKey('daily');
      expect(key).toMatch(/^leaderboard:daily:\d{4}-\d{2}-\d{2}$/);
    });

    it('should return a weekly key matching the pattern', () => {
      const key = service.resolveKey('weekly');
      expect(key).toMatch(/^leaderboard:weekly:\d{4}-\d{2}$/);
    });
  });
});
