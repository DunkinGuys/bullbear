'use client';

import Link from 'next/link';
import { TrendingUp, Search, User } from 'lucide-react';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-950/95 backdrop-blur">
      <div className="container flex h-14 items-center px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl">🐂🐻</span>
          <span className="bg-gradient-to-r from-green-400 to-red-400 bg-clip-text text-transparent">
            BullBear
          </span>
        </Link>
        
        {/* Search */}
        <div className="flex-1 px-4">
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="종목 또는 트레이더 검색..."
              className="w-full rounded-full bg-gray-900 border border-gray-800 py-2 pl-10 pr-4 text-sm focus:border-green-500 focus:outline-none"
            />
          </div>
        </div>
        
        {/* Nav */}
        <nav className="flex items-center gap-4">
          <Link 
            href="/leaderboard" 
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-white"
          >
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">리더보드</span>
          </Link>
          <Link 
            href="/login" 
            className="flex items-center gap-1 rounded-full bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-500"
          >
            <User className="h-4 w-4" />
            <span>로그인</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
