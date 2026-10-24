'use client';

import { useEffect, useState, type MouseEvent } from 'react';

const ADMIN_THEMES = [
  { id: 'day', label: '白天版', description: '清爽浅色工作台', swatch: '#f4f7fb' },
  { id: 'tech', label: '科技感版', description: '明亮蓝色科技风', swatch: '#eef2fb' },
  { id: 'deepblue', label: '深蓝版', description: '沉浸式深色工作台', swatch: '#16243f' },
] as const;

type AdminTheme = (typeof ADMIN_THEMES)[number]['id'];

function isAdminTheme(value: string | null): value is AdminTheme {
  return ADMIN_THEMES.some(theme => theme.id === value);
}

function applyAdminTheme(theme: AdminTheme) {
  document.querySelector<HTMLElement>('.av[data-admin-theme]')?.setAttribute('data-theme', theme);
}

export function AdminThemePicker({ initialTheme = 'day' }: { initialTheme?: string }) {
  const initial = isAdminTheme(initialTheme) ? initialTheme : 'day';
  const [theme, setTheme] = useState<AdminTheme>(initial);

  useEffect(() => {
    const saved = window.localStorage.getItem('alsvid-admin-theme');
    const selected = isAdminTheme(saved) ? saved : initial;
    setTheme(selected);
    applyAdminTheme(selected);
  }, [initial]);

  function selectTheme(next: AdminTheme, event: MouseEvent<HTMLButtonElement>) {
    setTheme(next);
    window.localStorage.setItem('alsvid-admin-theme', next);
    applyAdminTheme(next);
    event.currentTarget.closest('details')?.removeAttribute('open');
  }

  const selected = ADMIN_THEMES.find(item => item.id === theme) ?? ADMIN_THEMES[0];

  return (
    <details className="av-theme-picker">
      <summary className="av-iconbtn" aria-label={`当前主题：${selected.label}`} title={`切换主题（当前：${selected.label}）`}>
        <span aria-hidden="true">◐</span>
        <span className="av-theme-current">{selected.label}</span>
      </summary>
      <div className="av-theme-options" role="group" aria-label="选择工作台主题">
        {ADMIN_THEMES.map(option => (
          <button
            className="av-theme-option"
            type="button"
            key={option.id}
            data-active={theme === option.id}
            aria-pressed={theme === option.id}
            onClick={event => selectTheme(option.id, event)}
          >
            <span className="av-theme-swatch" style={{ background: option.swatch }} aria-hidden="true" />
            <span><strong>{option.label}</strong><small>{option.description}</small></span>
            {theme === option.id ? <span className="av-theme-check" aria-hidden="true">✓</span> : null}
          </button>
        ))}
      </div>
    </details>
  );
}
