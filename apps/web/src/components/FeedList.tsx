'use client';

import type { FeedEntry } from '@pulserank/shared';
import { ActivityType } from '@pulserank/shared';

interface FeedListProps {
  entries: FeedEntry[];
}

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  [ActivityType.POST_CREATED]: 'created a post',
  [ActivityType.COMMENT_CREATED]: 'left a comment',
  [ActivityType.REACTION_RECEIVED]: 'received a reaction',
  [ActivityType.LOGIN]: 'logged in',
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  [ActivityType.POST_CREATED]: 'bg-green-100 text-green-700',
  [ActivityType.COMMENT_CREATED]: 'bg-blue-100 text-blue-700',
  [ActivityType.REACTION_RECEIVED]: 'bg-pink-100 text-pink-700',
  [ActivityType.LOGIN]: 'bg-slate-100 text-slate-600',
};

const POINTS_BADGE: Record<ActivityType, string> = {
  [ActivityType.POST_CREATED]: '+10',
  [ActivityType.COMMENT_CREATED]: '+4',
  [ActivityType.REACTION_RECEIVED]: '+2',
  [ActivityType.LOGIN]: '+1',
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function FeedList({ entries }: FeedListProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-16 text-slate-500">
        No activity yet. Record your first event!
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {entries.map((entry) => {
        const type = entry.type as ActivityType;
        const label = ACTIVITY_LABELS[type] ?? entry.type;
        const colorClass = ACTIVITY_COLORS[type] ?? 'bg-slate-100 text-slate-600';
        const pointsBadge = POINTS_BADGE[type] ?? `+${entry.points}`;

        return (
          <li
            key={entry.eventId}
            className="flex items-start gap-4 py-4 px-2 hover:bg-slate-50 rounded-md transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold text-sm shrink-0">
              {entry.username[0]?.toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-800 text-sm">
                  {entry.username}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorClass}`}>
                  {label}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {formatRelativeTime(entry.createdAt)}
              </p>
            </div>

            <div className="shrink-0">
              <span className="text-sm font-bold text-indigo-600">{pointsBadge} pts</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
