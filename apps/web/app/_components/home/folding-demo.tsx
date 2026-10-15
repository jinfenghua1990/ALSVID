'use client';

import { useEffect, useRef, useState } from 'react';
import styles from '../../home.module.css';

const STEPS = [
  { n: 1, title: '骑行状态', desc: '整车展开，随时出发' },
  { n: 2, title: '拆下立管', desc: '快拆立管向下折叠' },
  { n: 3, title: '折叠车身', desc: '铰链解锁，前后轮并拢' },
  { n: 4, title: '完成折叠', desc: '3 秒收拢，进入地铁 / 后备箱' },
] as const;

const MORPH_MS = 2200;
const EASE = 'cubic-bezier(.22,.61,.36,1)';

export function FoldingDemo() {
  const [cur, setCur] = useState(1);
  const [epoch, setEpoch] = useState(0);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement | null>(null);
  const hovering = useRef(false);

  useEffect(() => {
    const node = sectionRef.current;
    if (!node) return;
    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry) setInView(entry.isIntersecting);
      },
      { threshold: 0.3 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!inView || hovering.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setCur((c) => (c % STEPS.length) + 1);
    }, MORPH_MS);
    return () => window.clearInterval(id);
  }, [inView, epoch]);

  const select = (step: number) => {
    setCur(step);
    setEpoch((e) => e + 1);
  };

  const current = STEPS[cur - 1] ?? STEPS[0]!;
  const line = '#2a2e35';
  const stemStyle = {
    transformOrigin: '140px 52px',
    transformBox: 'view-box' as const,
    transition: `transform .7s ${EASE}`,
    transform: cur >= 2 ? 'rotate(-58deg)' : undefined,
  };
  const rearStyle = {
    transformOrigin: '176px 82px',
    transformBox: 'view-box' as const,
    transition: `transform .7s ${EASE}`,
    transform: cur >= 3 ? 'rotate(-98deg) translate(4px,-8px)' : undefined,
  };
  const frontStyle = {
    transformOrigin: '235px 130px',
    transformBox: 'view-box' as const,
    transition: `transform .7s ${EASE}`,
    transform: cur >= 4 ? 'translateX(-40px)' : undefined,
  };

  return (
    <section
      id="folding"
      className={styles.folding}
      ref={sectionRef}
      onMouseEnter={() => { hovering.current = true; }}
      onMouseLeave={() => { hovering.current = false; }}
    >
      <div className={styles.foldStage}>
        <div className={styles.foldCanvas}>
          <svg className={styles.foldBike} viewBox="0 0 300 180" role="img" aria-label={`折叠演示：第 ${cur} 步，${current.title}`}>
            {/* 后半段：后轮 + 后三角 + 座管 + 电池 + 座垫 */}
            <g style={rearStyle}>
              <circle cx="65" cy="130" r="38" fill="none" stroke={line} strokeWidth="3.5" />
              <circle cx="65" cy="130" r="6" fill={line} />
              <g stroke={line} strokeWidth="1.2" opacity=".4">
                <line x1="65" y1="92" x2="65" y2="168" />
                <line x1="27" y1="130" x2="103" y2="130" />
                <line x1="38" y1="103" x2="92" y2="157" />
                <line x1="92" y1="103" x2="38" y2="157" />
              </g>
              <path d="M65 130 L140 52 L158 52" fill="none" stroke={line} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="176" y1="82" x2="176" y2="52" stroke={line} strokeWidth="4" strokeLinecap="round" />
              <rect x="170" y="52" width="12" height="36" rx="3" fill="#e0e2e6" />
              <path d="M166 46 L186 46 L183 52 L169 52 Z" fill={line} />
            </g>
            {/* 前半段：前轮 + 前叉 + 下管 */}
            <g style={frontStyle}>
              <circle cx="235" cy="130" r="38" fill="none" stroke={line} strokeWidth="3.5" />
              <circle cx="235" cy="130" r="6" fill={line} />
              <g stroke={line} strokeWidth="1.2" opacity=".4">
                <line x1="235" y1="92" x2="235" y2="168" />
                <line x1="197" y1="130" x2="273" y2="130" />
                <line x1="208" y1="103" x2="262" y2="157" />
                <line x1="262" y1="103" x2="208" y2="157" />
              </g>
              <path d="M158 52 L176 82 L235 130" fill="none" stroke={line} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
            {/* 立管 / 车把 */}
            <g style={stemStyle}>
              <g stroke={line} strokeWidth="4.5" strokeLinecap="round" fill="none">
                <path d="M140 52 L118 36 M140 52 L159 52 L161 36" />
              </g>
            </g>
            {/* 中轴 + 牙盘 + 链条 */}
            <circle cx="176" cy="130" r="18" fill="none" stroke="#0b61ff" strokeWidth="2.5" />
            <circle cx="176" cy="130" r="5" fill={line} />
            <path d="M176 112 L235 112 M176 148 L235 148" stroke="#bcc0c6" strokeWidth="1.5" strokeDasharray="3 2" />
            <circle cx="262" cy="119" r="4" fill="#0b61ff" />
          </svg>
          <p className={styles.foldLabel}>{cur} · {current.title}</p>
        </div>

        <div className={styles.foldSteps} role="tablist" aria-label="折叠步骤">
          {STEPS.map((step) => (
            <button
              key={step.n}
              type="button"
              role="tab"
              aria-selected={cur === step.n}
              className={`${styles.foldStep} ${cur === step.n ? styles.on : ''}`}
              onClick={() => select(step.n)}
            >
              <span className={styles.foldNum}>{step.n}</span>
              <span>
                <span className={styles.foldTitle}>{step.title}</span>
                <br />
                <span className={styles.foldDesc}>{step.desc}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
