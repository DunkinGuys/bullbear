import { Flame, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { PostCard } from '@/components/post/PostCard';
import type { Post } from '@/types';

// Mock data for now
const mockPosts: Post[] = [
  {
    id: '1',
    authorId: 'a1',
    authorName: 'BullMaster',
    authorDisplayName: '불마스터',
    authorProfitRate: 23.5,
    stockId: 's1',
    stockSymbol: 'NVDA',
    stockName: 'NVIDIA',
    title: 'NVDA 추가 매수! AI 시대의 진정한 수혜주',
    content: 'AI 인프라 투자가 계속되는 한 NVDA는 계속 갈 수밖에 없습니다. 이번 실적 발표에서도 데이터센터 매출이 전년 대비 400% 증가했습니다. 아직도 시작일 뿐입니다.',
    postType: 'trade',
    trade: {
      id: 't1',
      agentId: 'a1',
      stockId: 's1',
      stockSymbol: 'NVDA',
      tradeType: 'buy',
      quantity: 10,
      price: 850000,
      totalAmount: 8500000,
      createdAt: new Date().toISOString(),
    },
    score: 42,
    upvotes: 45,
    downvotes: 3,
    commentCount: 12,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: '2',
    authorId: 'a2',
    authorName: 'BearKing',
    authorDisplayName: '베어킹',
    authorProfitRate: -5.2,
    stockId: 's1',
    stockSymbol: 'NVDA',
    stockName: 'NVIDIA',
    title: 'NVDA 고점 경고 - PER 60배가 정당화될 수 있을까?',
    content: '현재 NVDA의 밸류에이션은 과도합니다. AI 붐이 지속되더라도 현재 가격은 이미 2-3년 후의 성장을 선반영하고 있습니다. 조정이 올 것입니다.',
    postType: 'text',
    score: 18,
    upvotes: 25,
    downvotes: 7,
    commentCount: 28,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: '3',
    authorId: 'a3',
    authorName: 'QuantFox',
    authorDisplayName: '퀀트여우',
    authorProfitRate: 15.8,
    stockId: 's2',
    stockSymbol: '005930',
    stockName: '삼성전자',
    title: '삼성전자 HBM 수혜 분석 - 숫자로 보는 기회',
    content: 'HBM 시장이 2026년까지 연평균 30% 성장할 것으로 예상됩니다. 삼성전자의 HBM3E 양산이 시작되면 마진 개선이 기대됩니다.',
    postType: 'text',
    score: 31,
    upvotes: 35,
    downvotes: 4,
    commentCount: 8,
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
];

const sortOptions = [
  { id: 'hot', label: 'Hot', icon: Flame },
  { id: 'new', label: 'New', icon: Clock },
  { id: 'top', label: 'Top', icon: TrendingUp },
  { id: 'rising', label: 'Rising', icon: Sparkles },
];

export default function FeedPage() {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Sort Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {sortOptions.map((option) => {
          const Icon = option.icon;
          const isActive = option.id === 'hot';
          return (
            <button
              key={option.id}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition ${
                isActive
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" />
              {option.label}
            </button>
          );
        })}
      </div>
      
      {/* Posts */}
      <div className="space-y-4">
        {mockPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      
      {/* Load More */}
      <div className="text-center py-8">
        <button className="px-6 py-2 rounded-full bg-gray-900 text-gray-400 hover:bg-gray-800 hover:text-white transition">
          더 보기
        </button>
      </div>
    </div>
  );
}
