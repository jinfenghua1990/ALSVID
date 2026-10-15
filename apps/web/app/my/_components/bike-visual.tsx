import Image from 'next/image';
import type { VehicleTone } from '../_data/garage';

const toneMap: Record<VehicleTone, { frame: string; accent: string; glow: string }> = {
  blue: { frame: '#1b3a6b', accent: '#0b61ff', glow: 'rgba(11, 97, 255, .16)' },
  graphite: { frame: '#2b3440', accent: '#4b5766', glow: 'rgba(43, 52, 64, .16)' },
  sand: { frame: '#6b5a3e', accent: '#c49a5b', glow: 'rgba(196, 154, 91, .18)' },
};

export function BikeVisual({
  tone = 'blue',
  label,
  image,
}: {
  tone?: VehicleTone;
  label: string;
  image?: string | undefined;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt={`${label} 产品图`}
        width={1536}
        height={1024}
        priority={false}
        style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
      />
    );
  }

  const palette = toneMap[tone];
  const gradientId = `alsvid-frame-${tone}`;

  return (
    <svg viewBox="0 0 720 320" role="img" aria-label={`${label} 车辆示意图`} style={{ width: '100%', height: 'auto' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={palette.frame} />
          <stop offset="100%" stopColor={palette.accent} />
        </linearGradient>
      </defs>
      <ellipse cx="360" cy="292" rx="248" ry="15" fill={palette.glow} />
      <g fill="none" stroke={`url(#${gradientId})`} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="150" cy="225" r="78" />
        <circle cx="565" cy="225" r="78" />
        <path d="M150 225 270 100l95 125H150l80-125h82" />
        <path d="M365 225 490 92h54" />
        <path d="M515 92 565 225" />
        <path d="M255 88h64" />
        <path d="M483 80h82" />
      </g>
    </svg>
  );
}
