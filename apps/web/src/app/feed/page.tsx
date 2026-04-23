'use client';

import { useState, useEffect, useCallback } from 'react';
import FeedList from '@/components/FeedList';
import { api } from '@/lib/api';
import type { FeedEntry } from '@pulserank/shared';

export default function FeedPage() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const LIMIT = 20;
  const totalPages = Math.ceil(total / LIMIT);

  const fetchFeed = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.feed.get(p, LIMIT);
      setEntries(res.data);
      setTotal(res.meta?.total ?? 0);
    } catch (err) {
      setError('Failed to load feed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFeed(page);
  }, [page, fetchFeed]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Activity Feed</h1>
        <p className="text-sm text-slate-500 mt-1">
          Recent player activity — last 30 days
        </p>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4 text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-lg shadow ring-1 ring-black ring-opacity-5 px-4">
        {loading ? (
          <div className="space-y-4 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-slate-200 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded animate-pulse w-1/3" />
                  <div className="h-3 bg-slate-200 rounded animate-pulse w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <FeedList entries={entries} />
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="px-3 py-1.5 text-sm text-slate-600">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-slate-300 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
