'use client';

import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark';

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    const stored = window.localStorage.getItem('alsvid-theme');
    const next: ThemeMode = stored === 'dark' || stored === 'light'
      ? stored
      : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next);
  }, []);

  function toggle() {
    const next: ThemeMode = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    window.localStorage.setItem('alsvid-theme', next);
    applyTheme(next);
  }

  const targetLabel = theme === 'dark' ? '白天模式' : '黑夜模式';

  return (
    <button
      className="themeToggle"
      type="button"
      onClick={toggle}
      aria-label={`切换到${targetLabel}`}
      title={`切换到${targetLabel}`}
    >
      <span className="themeToggleIcon" aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
      <span className="themeToggleLabel">{theme === 'dark' ? '白天' : '黑夜'}</span>
    </button>
  );
}
