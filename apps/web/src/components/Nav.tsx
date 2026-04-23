'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearToken, getUsername, isAuthenticated } from '@/lib/auth';

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    setUsername(getUsername());
  }, []);

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  const linkClass = (path: string) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      pathname.startsWith(path)
        ? 'bg-indigo-700 text-white'
        : 'text-indigo-200 hover:bg-indigo-700 hover:text-white'
    }`;

  return (
    <nav className="bg-indigo-900 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Link href="/leaderboard" className="flex items-center gap-2">
              <span className="text-white font-bold text-lg tracking-tight">PulseRank</span>
              <span className="text-indigo-400 text-xs font-medium">LIVE</span>
            </Link>
            <div className="hidden sm:flex items-center gap-1 ml-6">
              <Link href="/leaderboard" className={linkClass('/leaderboard')}>
                Leaderboard
              </Link>
              <Link href="/feed" className={linkClass('/feed')}>
                Activity Feed
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {username ? (
              <>
                <span className="text-indigo-300 text-sm hidden sm:block">
                  {username}
                </span>
                <button
                  onClick={handleLogout}
                  className="text-indigo-200 hover:text-white text-sm font-medium transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/login"
                className="text-indigo-200 hover:text-white text-sm font-medium transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
