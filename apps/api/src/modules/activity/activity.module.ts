import { Module } from '@nestjs/common';
import { ActivityController } from './activity.controller';
import { ActivityService } from './activity.service';
import { PrismaService } from '../../db/prisma';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ActivityController],
  providers: [ActivityService, PrismaService],
  exports: [ActivityService],
})
export class ActivityModule {}
