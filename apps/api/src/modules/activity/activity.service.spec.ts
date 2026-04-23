import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, BadRequestException } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { PrismaService } from '../../db/prisma';
import { ActivityType } from '@pulserank/shared';

const mockActivityEvent = {
  id: 'event-id-1',
  userId: 'user-id-1',
  type: ActivityType.POST_CREATED,
  points: 10,
  metadata: {},
  createdAt: new Date('2024-03-15T10:00:00Z'),
};

const mockPrismaTransaction = jest.fn();

const mockPrismaService = {
  $transaction: mockPrismaTransaction,
  activityEvent: {
    findUnique: jest.fn(),
  },
};

describe('ActivityService', () => {
  let service: ActivityService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivityService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ActivityService>(ActivityService);
    jest.clearAllMocks();
  });

  describe('recordActivity', () => {
    it('should record an activity event successfully', async () => {
      mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown[]>) => {
        const mockTx = {
          idempotencyKey: { create: jest.fn().mockResolvedValue({}) },
          activityEvent: { create: jest.fn().mockResolvedValue(mockActivityEvent) },
          userScore: { upsert: jest.fn().mockResolvedValue({}) },
          outboxEvent: { create: jest.fn().mockResolvedValue({}) },
        };
        return fn(mockTx);
      });

      const result = await service.recordActivity(
        {
          userId: 'user-id-1',
          type: ActivityType.POST_CREATED,
          metadata: {},
        },
        'idempotency-key-1',
      );

      expect(result).toEqual(mockActivityEvent);
      expect(mockPrismaTransaction).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException for unknown activity type', async () => {
      await expect(
        service.recordActivity(
          {
            userId: 'user-id-1',
            type: 'unknown_type' as ActivityType,
            metadata: {},
          },
          'idempotency-key-2',
        ),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaTransaction).not.toHaveBeenCalled();
    });

    it('should throw ConflictException on duplicate idempotency key', async () => {
      const duplicateKeyError = Object.assign(new Error('Unique constraint failed'), {
        code: 'P2002',
      });

      mockPrismaTransaction.mockRejectedValue(duplicateKeyError);

      await expect(
        service.recordActivity(
          {
            userId: 'user-id-1',
            type: ActivityType.COMMENT_CREATED,
            metadata: {},
          },
          'duplicate-key',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should re-throw non-idempotency errors', async () => {
      const dbError = new Error('Database connection lost');

      mockPrismaTransaction.mockRejectedValue(dbError);

      await expect(
        service.recordActivity(
          {
            userId: 'user-id-1',
            type: ActivityType.LOGIN,
            metadata: {},
          },
          'some-key',
        ),
      ).rejects.toThrow('Database connection lost');
    });

    it('should assign correct points for each activity type', async () => {
      const expectedPoints: Record<ActivityType, number> = {
        [ActivityType.POST_CREATED]: 10,
        [ActivityType.COMMENT_CREATED]: 4,
        [ActivityType.REACTION_RECEIVED]: 2,
        [ActivityType.LOGIN]: 1,
      };

      for (const [type, points] of Object.entries(expectedPoints)) {
        const eventWithPoints = { ...mockActivityEvent, type, points };

        mockPrismaTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown[]>) => {
          const mockTx = {
            idempotencyKey: { create: jest.fn().mockResolvedValue({}) },
            activityEvent: { create: jest.fn().mockResolvedValue(eventWithPoints) },
            userScore: { upsert: jest.fn().mockResolvedValue({}) },
            outboxEvent: { create: jest.fn().mockResolvedValue({}) },
          };
          return fn(mockTx);
        });

        const result = await service.recordActivity(
          { userId: 'user-id-1', type: type as ActivityType },
          `key-${type}`,
        );

        expect(result.points).toBe(points);
      }
    });
  });

  describe('getEventById', () => {
    it('should return the event if found', async () => {
      (mockPrismaService.activityEvent.findUnique as jest.Mock).mockResolvedValue(
        mockActivityEvent,
      );

      const result = await service.getEventById('event-id-1');
      expect(result).toEqual(mockActivityEvent);
    });

    it('should return null if not found', async () => {
      (mockPrismaService.activityEvent.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await service.getEventById('nonexistent-id');
      expect(result).toBeNull();
    });
  });
});
