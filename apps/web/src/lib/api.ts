import { getToken } from './auth';
import type {
  LoginRequest,
  LoginResponse,
  LeaderboardEntry,
  FeedEntry,
  ApiResponse,
  LeaderboardWindow,
  UserProfile,
  RecordActivityRequest,
  RecordActivityResponse,
} from '@pulserank/shared';

const API_URL =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')
    : (process.env.API_URL ?? 'http://localhost:3001');

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: string };
      message = body.message ?? message;
    } catch {
      // ignore JSON parse errors
    }
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (dto: LoginRequest): Promise<LoginResponse> =>
      request<LoginResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(dto),
      }),

    logout: (): Promise<void> =>
      request<void>('/auth/logout', { method: 'POST' }),

    me: (): Promise<UserProfile> => request<UserProfile>('/auth/me'),
  },

  leaderboard: {
    get: (window: LeaderboardWindow = 'global'): Promise<ApiResponse<LeaderboardEntry[]>> =>
      request<ApiResponse<LeaderboardEntry[]>>(`/leaderboard?window=${window}`),
  },

  feed: {
    get: (page = 1, limit = 20): Promise<ApiResponse<FeedEntry[]>> =>
      request<ApiResponse<FeedEntry[]>>(`/feed?page=${page}&limit=${limit}`),
  },

  events: {
    record: (
      dto: RecordActivityRequest,
      idempotencyKey: string,
    ): Promise<RecordActivityResponse> =>
      request<RecordActivityResponse>('/events', {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify(dto),
      }),
  },
};

export { ApiError };
