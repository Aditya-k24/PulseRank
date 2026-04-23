import { Controller, Get, Query } from '@nestjs/common';
import { IsIn, IsOptional } from 'class-validator';
import { LeaderboardService } from './leaderboard.service';
import type { LeaderboardEntry, LeaderboardWindow, ApiResponse } from '@pulserank/shared';

class LeaderboardQueryDto {
  @IsOptional()
  @IsIn(['global', 'daily', 'weekly'])
  window?: LeaderboardWindow;
}

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(
    @Query() query: LeaderboardQueryDto,
  ): Promise<ApiResponse<LeaderboardEntry[]>> {
    const window: LeaderboardWindow = query.window ?? 'global';
    const data = await this.leaderboardService.getLeaderboard(window);
    return { data };
  }
}
