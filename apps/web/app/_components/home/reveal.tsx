'use client';

import { useEffect, useRef, type ReactNode } from 'react';

/** 进入视口后向上渐显一次（opacity + transform，仅合成层动画）。 */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.style.opacity = '1';
      node.style.transform = 'none';
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        io.disconnect();
        window.setTimeout(() => {
          node.classList.add('home-reveal-in');
        }, delay);
      },
      { threshold: 0.12 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className="home-reveal">
      {children}
    </div>
  );
}
