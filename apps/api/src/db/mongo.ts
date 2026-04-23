import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { MongoClient, Collection, Db } from 'mongodb';

export interface FeedEventDocument {
  eventId: string;
  userId: string;
  username: string;
  type: string;
  points: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

@Injectable()
export class MongoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoService.name);
  private client: MongoClient;
  private db: Db;

  async onModuleInit(): Promise<void> {
    const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/pulserank';
    this.client = new MongoClient(uri);
    await this.client.connect();

    const dbName = new URL(uri).pathname.slice(1) || 'pulserank';
    this.db = this.client.db(dbName);

    await this.ensureIndexes();
    this.logger.log(`Connected to MongoDB: ${dbName}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
    this.logger.log('Disconnected from MongoDB');
  }

  private async ensureIndexes(): Promise<void> {
    const col = this.feedEvents;

    // TTL index: auto-delete documents older than 30 days
    await col.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

    // Unique index on eventId for idempotent inserts from outbox worker
    await col.createIndex({ eventId: 1 }, { unique: true });

    // Compound index for pagination queries
    await col.createIndex({ createdAt: -1 });
  }

  get feedEvents(): Collection<FeedEventDocument> {
    return this.db.collection<FeedEventDocument>('feedEvents');
  }
}
