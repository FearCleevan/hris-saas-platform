import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'HRISPH — Enterprise HRIS for the Philippines';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '80px',
          background: 'linear-gradient(135deg, #0038a8 0%, #001f6a 60%, #0a0a1a 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* PH flag accent bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '8px',
            background: 'linear-gradient(90deg, #0038a8 33%, #ce1126 33% 66%, #fcd116 66%)',
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              fontWeight: '900',
              color: '#fcd116',
            }}
          >
            H
          </div>
          <span style={{ fontSize: '28px', fontWeight: '700', color: '#ffffff' }}>
            HRISPH
          </span>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: '60px',
            fontWeight: '900',
            color: '#ffffff',
            lineHeight: 1.1,
            maxWidth: '800px',
            marginBottom: '24px',
          }}
        >
          Enterprise HRIS for the Philippines
        </div>

        {/* Subtext */}
        <div
          style={{
            fontSize: '26px',
            color: 'rgba(255,255,255,0.7)',
            maxWidth: '700px',
            lineHeight: 1.4,
            marginBottom: '48px',
          }}
        >
          Automated payroll · SSS · PhilHealth · Pag-IBIG · BIR TRAIN Law
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '16px' }}>
          {['1,800+ Companies', '₱2B+ Monthly Payroll', '100% TRAIN Law Accurate'].map((badge) => (
            <div
              key={badge}
              style={{
                padding: '10px 20px',
                borderRadius: '999px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                fontSize: '18px',
                fontWeight: '600',
              }}
            >
              {badge}
            </div>
          ))}
        </div>

        {/* URL */}
        <div
          style={{
            position: 'absolute',
            bottom: '48px',
            right: '80px',
            fontSize: '20px',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          hrisph.com
        </div>
      </div>
    ),
    { ...size },
  );
}
