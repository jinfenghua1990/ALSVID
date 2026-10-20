'use client';

import { useEffect, useRef } from 'react';
import { loginBicycleMarkup } from './portal-login-bicycle-markup';

export function PortalLoginBicycle({ boosted }: { boosted: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const boost = useRef(boosted);
  useEffect(() => { boost.current = boosted; }, [boosted]);
  useEffect(() => {
    const root = container.current?.querySelector('svg');
    if (!root) return;
    const rear = root.querySelector('#rearRotor');
    const front = root.querySelector('#frontRotor');
    const chain = root.querySelector('#chainLinks');
    const level = root.querySelector<SVGElement>('.chargeLevel');
    const reveal = root.querySelector<SVGElement>('.chargeReveal');
    const full = root.querySelector<SVGElement>('.chargeFull');
    if (!rear || !front || !chain || !level || !reveal || !full) return;
    root.classList.add('js');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let angle = 0, phase = 0, charge = 0, speed = .12, last: number | null = null, frame = 0;
    const chainUnits = 2 * Math.PI * 20.5 * 800 / 660.4316301315156;
    const sample = (p: number, stops: number[][]) => {
      for (let i = 1; i < stops.length; i++) {
        const [a, x] = stops[i - 1]!, [b, y] = stops[i]!;
        if (p <= b!) { const t = Math.max(0, Math.min(1, (p - a!) / (b! - a!))); return x! + (y! - x!) * t * t * (3 - 2 * t); }
      }
      return stops[stops.length - 1]![1]!;
    };
    const render = () => {
      rear.setAttribute('transform', 'rotate(' + angle + ' 282.5 405.4)');
      front.setAttribute('transform', 'rotate(' + angle + ' 767 405.5)');
      chain.setAttribute('stroke-dashoffset', String(-phase));
      level.style.opacity = String(sample(charge, [[0,0],[.08,0],[.14,.95],[.62,1],[.78,1],[.90,0],[1,0]]));
      reveal.setAttribute('transform', 'translate(0 ' + sample(charge, [[0,239],[.08,239],[.62,0],[.90,0],[.91,239],[1,239]]) + ')');
      full.style.opacity = String(sample(charge, [[0,0],[.60,0],[.69,.8],[.76,.3],[.82,0],[1,0]]));
      root.setAttribute('data-wheel-speed', speed.toFixed(3));
    };
    const tick = (now: number) => {
      if (reduced.matches || document.hidden) return;
      const dt = last === null ? 0 : Math.min((now - last) / 1000, .05); last = now;
      const target = boost.current ? 1.15 : .12;
      speed += (target - speed) * (1 - Math.exp(-dt / (target > speed ? .75 : .9)));
      angle = (angle + speed * 360 * dt) % 360;
      phase = (phase + speed * dt * chainUnits) % 10;
      charge = (charge + (1 / 20 + Math.max(0, Math.min(1, (speed - .12) / 1.03)) * (1 / 2.2 - 1 / 20)) * dt) % 1;
      render(); frame = requestAnimationFrame(tick);
    };
    const restart = () => { cancelAnimationFrame(frame); last = null; if (!reduced.matches && !document.hidden) frame = requestAnimationFrame(tick); };
    render(); restart();
    reduced.addEventListener('change', restart);
    document.addEventListener('visibilitychange', restart);
    return () => { cancelAnimationFrame(frame); reduced.removeEventListener('change', restart); document.removeEventListener('visibilitychange', restart); };
  }, []);
  return <div ref={container} aria-hidden="true" dangerouslySetInnerHTML={{ __html: loginBicycleMarkup }} />;
}
