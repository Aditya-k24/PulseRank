'use client';

import { useEffect, useRef } from 'react';
import type { LeaderboardEntry } from '@pulserank/shared';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  updatedUserId?: string | null;
}

const MEDAL_COLORS: Record<number, string> = {
  1: 'text-yellow-500',
  2: 'text-slate-400',
  3: 'text-amber-600',
};

export default function LeaderboardTable({ entries, updatedUserId }: LeaderboardTableProps) {
  const prevEntriesRef = useRef<LeaderboardEntry[]>([]);
  const highlightedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (updatedUserId) {
      highlightedRef.current.add(updatedUserId);
      const timer = setTimeout(() => {
        highlightedRef.current.delete(updatedUserId);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [updatedUserId]);

  useEffect(() => {
    prevEntriesRef.current = entries;
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        No leaderboard data yet. Start recording activities!
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg shadow ring-1 ring-black ring-opacity-5">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">
              Rank
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Player
            </th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Score
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-slate-100">
          {entries.map((entry) => {
            const isUpdated = highlightedRef.current.has(entry.userId);
            const medalColor = MEDAL_COLORS[entry.rank];

            return (
              <tr
                key={entry.userId}
                className={`transition-colors duration-700 ${
                  isUpdated ? 'bg-indigo-50' : 'hover:bg-slate-50'
                }`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`text-sm font-bold ${
                      medalColor ?? 'text-slate-600'
                    }`}
                  >
                    {entry.rank <= 3 ? `#${entry.rank}` : entry.rank}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm">
                      {entry.username[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-medium text-slate-800">
                      {entry.username}
                    </span>
                    {isUpdated && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-700 animate-pulse">
                        updated
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-semibold text-slate-800 tabular-nums">
                    {entry.score.toLocaleString()}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
