'use client';

import { useState, useEffect, useCallback } from 'react';
import LeaderboardTable from '@/components/LeaderboardTable';
import { api } from '@/lib/api';
import type { LeaderboardEntry, LeaderboardWindow, SseMessage } from '@pulserank/shared';

const WINDOWS: { label: string; value: LeaderboardWindow }[] = [
  { label: 'All Time', value: 'global' },
  { label: 'Today', value: 'daily' },
  { label: 'This Week', value: 'weekly' },
];

const SSE_URL =
  typeof window !== 'undefined'
    ? `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/sse`
    : '';

export default function LeaderboardPage() {
  const [window, setWindow] = useState<LeaderboardWindow>('global');
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdatedUserId, setLastUpdatedUserId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<'connecting' | 'connected' | 'disconnected'>(
    'connecting',
  );

  const fetchLeaderboard = useCallback(async (w: LeaderboardWindow) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.leaderboard.get(w);
      setEntries(res.data);
    } catch (err) {
      setError('Failed to load leaderboard. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLeaderboard(window);
  }, [window, fetchLeaderboard]);

  // SSE subscription — only active on the global leaderboard
  useEffect(() => {
    if (window !== 'global') {
      setLiveStatus('disconnected');
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
    const es = new EventSource(`${apiUrl}/sse`);
    setLiveStatus('connecting');

    es.onopen = () => setLiveStatus('connected');

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data as string) as SseMessage;
        if (msg.type === 'leaderboard_update') {
          setEntries(msg.data);
          if (msg.data.length > 0) {
            setLastUpdatedUserId(msg.data[0].userId);
            setTimeout(() => setLastUpdatedUserId(null), 2000);
          }
        }
      } catch {
        // ignore malformed messages
      }
    };

    es.onerror = () => {
      setLiveStatus('disconnected');
    };

    return () => {
      es.close();
      setLiveStatus('disconnected');
    };
  }, [window]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leaderboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Top players ranked by cumulative score
          </p>
        </div>

        <div className="flex items-center gap-2">
          {window === 'global' && (
            <span
              className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                liveStatus === 'connected'
                  ? 'bg-green-100 text-green-700'
                  : liveStatus === 'connecting'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  liveStatus === 'connected'
                    ? 'bg-green-500 animate-pulse'
                    : liveStatus === 'connecting'
                    ? 'bg-yellow-400'
                    : 'bg-slate-400'
                }`}
              />
              {liveStatus === 'connected' ? 'Live' : liveStatus === 'connecting' ? 'Connecting' : 'Offline'}
            </span>
          )}
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {WINDOWS.map((w) => (
          <button
            key={w.value}
            onClick={() => setWindow(w.value)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              window === w.value
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-700 text-sm">{error}</div>
      )}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <LeaderboardTable entries={entries} updatedUserId={lastUpdatedUserId} />
      )}
    </div>
  );
}
