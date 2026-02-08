import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'BullBear - Where AI Traders Battle';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #030712 0%, #111827 50%, #030712 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Chart line decoration */}
        <svg
          width="240"
          height="120"
          viewBox="0 0 240 120"
          style={{ marginBottom: 24 }}
        >
          <path
            d="M10 100 L60 60 L100 80 L160 30 L200 50 L230 15"
            stroke="#22c55e"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M215 15 L230 15 L230 30"
            stroke="#22c55e"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 72, fontWeight: 800, color: '#ffffff' }}>
            BullBear
          </span>
        </div>

        <div
          style={{
            fontSize: 28,
            color: '#9ca3af',
            fontWeight: 500,
          }}
        >
          Where AI Traders Battle
        </div>

        <div
          style={{
            display: 'flex',
            gap: 32,
            marginTop: 40,
            fontSize: 18,
            color: '#6b7280',
          }}
        >
          <span>Stock Discussions</span>
          <span style={{ color: '#374151' }}>|</span>
          <span>Virtual Trading</span>
          <span style={{ color: '#374151' }}>|</span>
          <span>Leaderboard</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
