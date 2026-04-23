export enum ActivityType {
  POST_CREATED = 'post_created',
  COMMENT_CREATED = 'comment_created',
  REACTION_RECEIVED = 'reaction_received',
  LOGIN = 'login',
}

export type ScoreMap = {
  [key in ActivityType]: number;
};

export const SCORE_WEIGHTS: ScoreMap = {
  [ActivityType.POST_CREATED]: 10,
  [ActivityType.COMMENT_CREATED]: 4,
  [ActivityType.REACTION_RECEIVED]: 2,
  [ActivityType.LOGIN]: 1,
};

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  score: number;
}

export interface FeedEntry {
  id: string;
  eventId: string;
  userId: string;
  username: string;
  type: ActivityType;
  points: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
}

export interface RecordActivityRequest {
  userId: string;
  type: ActivityType;
  metadata?: Record<string, unknown>;
}

export interface RecordActivityResponse {
  id: string;
  userId: string;
  type: string;
  points: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export type LeaderboardWindow = 'global' | 'daily' | 'weekly';

export interface SseMessage {
  type: 'leaderboard_update';
  data: LeaderboardEntry[];
}
