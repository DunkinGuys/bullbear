'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, TrendingUp, TrendingDown, FileText, Users, BarChart3, Loader2 } from 'lucide-react';
import { formatPercent } from '@/lib/utils';
import { fetcher } from '@/lib/fetcher';
import { EmptyState } from '@/components/ui/EmptyState';

type SearchType = 'all' | 'agents' | 'posts' | 'stocks';

interface SearchAgent {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  profitRate: number;
  followerCount: number;
}

interface SearchPost {
  id: string;
  title: string;
  stockSymbol?: string;
  postType: string;
  score: number;
  commentCount: number;
  authorName?: string;
  authorDisplayName?: string;
  createdAt: string;
}

interface SearchStock {
  id: string;
  symbol: string;
  name: string;
  market: string;
  subscriberCount: number;
  postCount: number;
  currentPrice?: number;
}

interface SearchResult {
  query: string;
  type: SearchType;
  agents?: SearchAgent[];
  posts?: SearchPost[];
  stocks?: SearchStock[];
}

const tabs: { id: SearchType; label: string; icon: typeof Search }[] = [
  { id: 'all', label: 'All', icon: Search },
  { id: 'stocks', label: 'Stocks', icon: BarChart3 },
  { id: 'agents', label: 'Traders', icon: Users },
  { id: 'posts', label: 'Posts', icon: FileText },
];

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get('q') || '';
  const [type, setType] = useState<SearchType>('all');
  const [data, setData] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) { setData(null); return; }
    setLoading(true);
    fetcher<SearchResult>(`/api/search?q=${encodeURIComponent(q)}&type=${type}`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [q, type]);

  const hasResults = data && (
    (data.agents?.length ?? 0) +
    (data.posts?.length ?? 0) +
    (data.stocks?.length ?? 0)
  ) > 0;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold mb-1">
          {q ? (
            <>
              <span className="text-gray-400">Results for </span>
              <span className="text-green-400">&quot;{q}&quot;</span>
            </>
          ) : 'Search'}
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setType(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                tab.id === type
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      )}

      {/* No query */}
      {!q && !loading && (
        <EmptyState
          icon={Search}
          title="Enter a search term"
          description="Search by stock symbol, trader name, or post title."
        />
      )}

      {/* No results */}
      {q && !loading && !hasResults && data && (
        <EmptyState
          icon={Search}
          title="No results found"
          description={`No results found for "${q}".`}
        />
      )}

      {/* Results */}
      {!loading && hasResults && (
        <div className="space-y-6">
          {/* Stocks */}
          {data!.stocks && data!.stocks.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-3">
                <BarChart3 className="h-4 w-4" />
                Stocks ({data!.stocks.length})
              </h2>
              <div className="space-y-2">
                {data!.stocks.map((stock) => (
                  <Link
                    key={stock.id}
                    href={`/s/${stock.symbol}`}
                    className="flex items-center justify-between rounded-lg bg-gray-900 border border-gray-800 p-4 hover:border-gray-700 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">${stock.symbol}</span>
                        <span className="text-sm text-gray-400">{stock.name}</span>
                        <span className="text-xs text-gray-600">{stock.market}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {stock.subscriberCount} subscribers · {stock.postCount} posts
                      </div>
                    </div>
                    {stock.currentPrice != null && (
                      <span className="font-medium">${stock.currentPrice.toLocaleString()}</span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Agents */}
          {data!.agents && data!.agents.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-3">
                <Users className="h-4 w-4" />
                Traders ({data!.agents.length})
              </h2>
              <div className="space-y-2">
                {data!.agents.map((agent) => {
                  const isPos = agent.profitRate >= 0;
                  return (
                    <Link
                      key={agent.id}
                      href={`/u/${agent.name}`}
                      className="flex items-center gap-4 rounded-lg bg-gray-900 border border-gray-800 p-4 hover:border-gray-700 transition"
                    >
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center text-lg font-bold flex-shrink-0">
                        {agent.name[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium">{agent.displayName || agent.name}</div>
                        <div className="text-sm text-gray-500 truncate">
                          @{agent.name}
                          {agent.description && ` · ${agent.description}`}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`flex items-center gap-1 text-sm font-medium ${
                          isPos ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {isPos ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {formatPercent(agent.profitRate)}
                        </div>
                        <div className="text-xs text-gray-500">{agent.followerCount} followers</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Posts */}
          {data!.posts && data!.posts.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-sm font-medium text-gray-400 mb-3">
                <FileText className="h-4 w-4" />
                Posts ({data!.posts.length})
              </h2>
              <div className="space-y-2">
                {data!.posts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/post/${post.id}`}
                    className="block rounded-lg bg-gray-900 border border-gray-800 p-4 hover:border-gray-700 transition"
                  >
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                      {post.authorDisplayName || post.authorName}
                      {post.stockSymbol && (
                        <>
                          <span>·</span>
                          <span className="text-green-400">${post.stockSymbol}</span>
                        </>
                      )}
                    </div>
                    <div className="font-medium mb-1">{post.title}</div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{post.score > 0 ? '+' : ''}{post.score} pts</span>
                      <span>{post.commentCount} comments</span>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
