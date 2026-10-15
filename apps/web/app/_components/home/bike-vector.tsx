import type { CSSProperties } from 'react';

/**
 * ALSVID 官网共享矢量车型插画。
 * tone='light' 用于深色/渐变背景（白色线条），
 * tone='dark' 用于浅色背景（墨色线条 + 品牌蓝点缀）。
 */
export function BikeVector({
  tone = 'dark',
  className,
  style,
}: {
  tone?: 'dark' | 'light' | undefined;
  className?: string | undefined;
  style?: CSSProperties | undefined;
}) {
  const line = tone === 'light' ? 'rgba(255,255,255,.88)' : '#2a2e35';
  const faint = tone === 'light' ? 'rgba(255,255,255,.4)' : '#bcc0c6';
  const spokes = tone === 'light' ? 'rgba(255,255,255,.5)' : 'rgba(42,46,53,.35)';
  const accent = tone === 'light' ? 'rgba(255,255,255,.6)' : '#0b61ff';

  return (
    <svg viewBox="0 0 300 180" className={className} style={style} aria-hidden="true">
      {/* 车轮 */}
      <circle cx="65" cy="130" r="38" fill="none" stroke={line} strokeWidth="3.5" />
      <circle cx="235" cy="130" r="38" fill="none" stroke={line} strokeWidth="3.5" />
      <circle cx="65" cy="130" r="6" fill={line} />
      <circle cx="235" cy="130" r="6" fill={line} />
      <g data-wheel stroke={spokes} strokeWidth="1.2" style={{ transformOrigin: '65px 130px', transformBox: 'view-box' }}>
        <line x1="65" y1="92" x2="65" y2="168" />
        <line x1="27" y1="130" x2="103" y2="130" />
        <line x1="38" y1="103" x2="92" y2="157" />
        <line x1="92" y1="103" x2="38" y2="157" />
      </g>
      <g data-wheel stroke={spokes} strokeWidth="1.2" style={{ transformOrigin: '235px 130px', transformBox: 'view-box' }}>
        <line x1="235" y1="92" x2="235" y2="168" />
        <line x1="197" y1="130" x2="273" y2="130" />
        <line x1="208" y1="103" x2="262" y2="157" />
        <line x1="262" y1="103" x2="208" y2="157" />
      </g>
      {/* 车架 */}
      <path
        d="M65 130 L140 52 L158 52 L176 82 L235 130"
        fill="none"
        stroke={line}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* 座管 + 电池 */}
      <line x1="176" y1="82" x2="176" y2="52" stroke={line} strokeWidth="4" strokeLinecap="round" />
      <rect x="170" y="52" width="12" height="36" rx="3" fill={tone === 'light' ? 'rgba(255,255,255,.25)' : '#e0e2e6'} />
      {/* 座垫 */}
      <path d="M166 46 L186 46 L183 52 L169 52 Z" fill={line} />
      {/* 车把 */}
      <g stroke={line} strokeWidth="4.5" strokeLinecap="round" fill="none">
        <path d="M140 52 L118 36 M140 52 L159 52 L161 36" />
      </g>
      {/* 中置电机 + 牙盘 */}
      <circle cx="176" cy="130" r="18" fill="none" stroke={accent} strokeWidth="2.5" />
      <circle cx="176" cy="130" r="5" fill={line} />
      {/* 链条 */}
      <path d="M176 112 L235 112 M176 148 L235 148" stroke={faint} strokeWidth="1.5" strokeDasharray="3 2" />
      {/* 前灯 */}
      <circle cx="262" cy="119" r="4" fill={accent} />
    </svg>
  );
}
