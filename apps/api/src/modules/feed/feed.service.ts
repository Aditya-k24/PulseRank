import { Injectable, Logger } from '@nestjs/common';
import { MongoService } from '../../db/mongo';
import type { FeedEntry, ApiResponse } from '@pulserank/shared';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(private readonly mongo: MongoService) {}

  async getFeed(page: number, limit: number): Promise<ApiResponse<FeedEntry[]>> {
    const safeLimit = Math.min(limit, MAX_LIMIT);
    const safePage = Math.max(page, 1);
    const skip = (safePage - 1) * safeLimit;

    const [documents, total] = await Promise.all([
      this.mongo.feedEvents
        .find({})
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit)
        .toArray(),
      this.mongo.feedEvents.countDocuments({}),
    ]);

    const data: FeedEntry[] = documents.map((doc) => ({
      id: doc._id?.toString() ?? '',
      eventId: doc.eventId,
      userId: doc.userId,
      username: doc.username,
      type: doc.type as FeedEntry['type'],
      points: doc.points,
      metadata: doc.metadata,
      createdAt: doc.createdAt.toISOString(),
    }));

    return {
      data,
      meta: {
        page: safePage,
        limit: safeLimit,
        total,
      },
    };
  }
}
