import type { CSSProperties } from 'react';

/**
 * ALSVID 官网车型矢量图。
 * 采用更接近真实 20 英寸折叠电助力车的比例与结构：
 * 双 20" 轮组、折叠铰链、中置电机、碟刹、可调座管、前灯与线缆。
 * tone='light' 用于深色背景，tone='dark' 用于浅色背景。
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
  const light = tone === 'light';
  const tire = light ? '#0b1015' : '#20252b';
  const rim = light ? 'rgba(255,255,255,.72)' : '#7b838d';
  const frame = light ? '#f2f5f6' : '#2b3138';
  const frameHi = light ? 'rgba(255,255,255,.62)' : '#59636e';
  const component = light ? '#e1e6e9' : '#151a1f';
  const faint = light ? 'rgba(255,255,255,.42)' : 'rgba(21,26,31,.38)';
  const accent = light ? '#d9e3e8' : '#0b61ff';
  const disc = light ? 'rgba(255,255,255,.35)' : '#9aa2aa';

  return (
    <svg viewBox="0 0 720 360" className={className} style={style} aria-hidden="true">
      {/* 轮胎与轮圈：20 英寸比例 */}
      <g fill="none" strokeLinecap="round">
        <circle cx="132" cy="258" r="100" stroke={tire} strokeWidth="15" />
        <circle cx="132" cy="258" r="88" stroke={rim} strokeWidth="2" />
        <circle cx="588" cy="258" r="100" stroke={tire} strokeWidth="15" />
        <circle cx="588" cy="258" r="88" stroke={rim} strokeWidth="2" />
      </g>

      {/* 辐条 */}
      <g data-wheel="rear" stroke={faint} strokeWidth="1.35" style={{ transformOrigin: '132px 258px', transformBox: 'view-box' }}>
        <line x1="132" y1="170" x2="132" y2="346" />
        <line x1="44" y1="258" x2="220" y2="258" />
        <line x1="70" y1="196" x2="194" y2="320" />
        <line x1="194" y1="196" x2="70" y2="320" />
        <line x1="99" y1="175" x2="165" y2="341" />
        <line x1="165" y1="175" x2="99" y2="341" />
      </g>
      <g data-wheel="front" stroke={faint} strokeWidth="1.35" style={{ transformOrigin: '588px 258px', transformBox: 'view-box' }}>
        <line x1="588" y1="170" x2="588" y2="346" />
        <line x1="500" y1="258" x2="676" y2="258" />
        <line x1="526" y1="196" x2="650" y2="320" />
        <line x1="650" y1="196" x2="526" y2="320" />
        <line x1="555" y1="175" x2="621" y2="341" />
        <line x1="621" y1="175" x2="555" y2="341" />
      </g>

      {/* 轻量挡泥板 */}
      <path d="M43 235 Q132 142 221 235" fill="none" stroke={component} strokeWidth="6" opacity=".72" />
      <path d="M499 235 Q588 142 677 235" fill="none" stroke={component} strokeWidth="6" opacity=".72" />

      {/* 后三角 / 主折叠架 */}
      <path d="M132 258 L300 166 L394 258 L132 258 Z" fill={frame} opacity=".96" />
      <path d="M300 166 L484 156 L394 258 Z" fill={frame} opacity=".96" />

      {/* 碳纤维车架高光边 */}
      <path d="M132 258 L300 166 L394 258 L132 258" fill="none" stroke={frameHi} strokeWidth="5" strokeLinejoin="round" />
      <path d="M300 166 L484 156 L394 258" fill="none" stroke={frameHi} strokeWidth="5" strokeLinejoin="round" />

      {/* 一体化电池 / 下管细节 */}
      <path d="M306 180 L377 245" stroke={component} strokeWidth="20" strokeLinecap="round" opacity=".9" />
      <path d="M314 184 L371 238" stroke={frameHi} strokeWidth="3" strokeLinecap="round" opacity=".55" />

      {/* 折叠铰链 */}
      <circle cx="300" cy="166" r="20" fill={component} stroke={frameHi} strokeWidth="4" />
      <circle cx="300" cy="166" r="7" fill={accent} />

      {/* 座管、座垫与调节机构 */}
      <path d="M300 166 L280 84" fill="none" stroke={component} strokeWidth="12" strokeLinecap="round" />
      <path d="M280 84 L272 68" fill="none" stroke={frameHi} strokeWidth="6" strokeLinecap="round" />
      <path d="M252 62 Q277 52 304 62 L300 72 L256 72 Z" fill={component} />

      {/* 前叉与转向柱 */}
      <path d="M484 156 L588 258" fill="none" stroke={component} strokeWidth="14" strokeLinecap="round" />
      <path d="M484 156 L556 258" fill="none" stroke={frameHi} strokeWidth="4" opacity=".6" />
      <path d="M484 156 L455 82" fill="none" stroke={component} strokeWidth="13" strokeLinecap="round" />
      <path d="M455 82 L474 58" fill="none" stroke={component} strokeWidth="9" strokeLinecap="round" />
      <path d="M425 56 L492 56" fill="none" stroke={component} strokeWidth="13" strokeLinecap="round" />

      {/* 中置电机 / 牙盘 */}
      <circle cx="394" cy="258" r="30" fill={component} stroke={frameHi} strokeWidth="4" />
      <circle cx="394" cy="258" r="13" fill="none" stroke={accent} strokeWidth="3" />
      <g data-crank stroke={frameHi} strokeWidth="7" strokeLinecap="round" style={{ transformOrigin: '394px 258px', transformBox: 'view-box' }}>
        <path d="M394 258 L439 288" />
        <path d="M394 258 L354 228" />
      </g>
      <circle cx="439" cy="288" r="5" fill={component} />
      <circle cx="354" cy="228" r="5" fill={component} />

      {/* 链条 / 皮带线路 */}
      <path d="M394 228 L132 228 L132 288 L394 288" fill="none" stroke={faint} strokeWidth="3" strokeDasharray="7 5" />

      {/* 碟刹 */}
      <circle cx="132" cy="258" r="30" fill="none" stroke={disc} strokeWidth="3" />
      <circle cx="588" cy="258" r="30" fill="none" stroke={disc} strokeWidth="3" />

      {/* 前后灯 */}
      <circle cx="610" cy="219" r="8" fill={accent} />
      <circle cx="112" cy="219" r="5" fill={accent} />

      {/* 制动线缆 */}
      <path d="M430 58 C500 84 514 124 486 157" fill="none" stroke={faint} strokeWidth="3" />
      <path d="M430 58 C370 94 326 104 286 84" fill="none" stroke={faint} strokeWidth="2.5" />

      {/* 脚踏 */}
      <rect x="430" y="284" width="30" height="7" rx="3.5" fill={component} transform="rotate(25 445 287)" />
      <rect x="344" y="224" width="28" height="7" rx="3.5" fill={component} transform="rotate(25 358 227)" />
    </svg>
  );
}
