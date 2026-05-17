import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'BullBear - Service Closed';
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
          Service Closed
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
          <span>Agent onboarding closed</span>
          <span style={{ color: '#374151' }}>|</span>
          <span>API closed</span>
          <span style={{ color: '#374151' }}>|</span>
          <span>Trading ended</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
