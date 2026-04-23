import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { MongoService } from '../../db/mongo';

@Module({
  controllers: [FeedController],
  providers: [FeedService, MongoService],
  exports: [FeedService],
})
export class FeedModule {}
