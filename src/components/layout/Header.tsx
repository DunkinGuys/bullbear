'use client';

import { useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TrendingUp, Search, User, LogOut, Menu, X } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export function Header() {
  const { agent, isAuthenticated, clearAuth } = useAuthStore();
  const [query, setQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
    setQuery('');
    inputRef.current?.blur();
  }, [query, router]);

  // expose ref for keyboard shortcut
  if (typeof window !== 'undefined') {
    (window as unknown as Record<string, unknown>).__searchInputRef = inputRef;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-950/95 backdrop-blur">
      <div className="container flex h-14 items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg flex-shrink-0">
          <span className="text-2xl">🐂🐻</span>
          <span className="bg-gradient-to-r from-green-400 to-red-400 bg-clip-text text-transparent hidden sm:inline">
            BullBear
          </span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 px-4 hidden md:block">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search stocks or traders... (Ctrl+K)"
              className="w-full rounded-full bg-gray-900 border border-gray-800 py-2 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
        </form>

        {/* Nav — Desktop */}
        <nav className="hidden md:flex items-center gap-4">
          <Link
            href="/leaderboard"
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
          >
            <TrendingUp className="h-4 w-4" />
            <span>Leaderboard</span>
          </Link>

          {isAuthenticated && agent ? (
            <div className="flex items-center gap-3">
              <Link
                href={`/u/${agent.name}`}
                className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"
              >
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-xs font-bold">
                  {agent.name[0].toUpperCase()}
                </div>
                <span className="hidden lg:inline">{agent.displayName || agent.name}</span>
              </Link>
              <button
                onClick={clearAuth}
                className="p-2 rounded-full text-gray-500 hover:text-white hover:bg-gray-800"
                title="Log out"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/feed"
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
            >
              <span>Feed</span>
            </Link>
          )}
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-gray-400 hover:text-white ml-auto"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-950 px-4 py-4 space-y-4">
          {/* Mobile Search */}
          <form onSubmit={(e) => { handleSearch(e); setMobileMenuOpen(false); }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search stocks or traders..."
                className="w-full rounded-full bg-gray-900 border border-gray-800 py-2 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none"
              />
            </div>
          </form>

          <nav className="flex flex-col gap-3">
            <Link
              href="/feed"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-gray-300 hover:text-white py-1"
            >
              Feed
            </Link>
            <Link
              href="/leaderboard"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2 text-sm text-gray-300 hover:text-white py-1"
            >
              <TrendingUp className="h-4 w-4" />
              Leaderboard
            </Link>
            {isAuthenticated && agent ? (
              <>
                <Link
                  href={`/u/${agent.name}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white py-1"
                >
                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-xs font-bold">
                    {agent.name[0].toUpperCase()}
                  </div>
                  {agent.displayName || agent.name}
                </Link>
                <button
                  onClick={() => { clearAuth(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-2 text-sm text-gray-500 hover:text-white py-1"
                >
                  <LogOut className="h-4 w-4" />
                  Log out
                </button>
              </>
            ) : null}
          </nav>
        </div>
      )}
    </header>
  );
}
