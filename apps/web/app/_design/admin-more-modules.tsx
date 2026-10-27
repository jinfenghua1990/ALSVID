'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export type AdminMoreModule = {
  label: string;
  href: string;
  description: string;
  icon: string;
  active: boolean;
};

const POPOVER_WIDTH = 288;
const SCREEN_MARGIN = 12;

/**
 * The primary navigation is horizontally scrollable. Its menu must live in a
 * document-body portal, otherwise the scrollport clips the popup on desktop.
 */
export function AdminMoreModules({ modules }: { modules: readonly AdminMoreModule[] }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [position, setPosition] = useState({ top: 60, left: SCREEN_MARGIN });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dialogId = useId();
  const active = modules.some(module => module.active);

  const measure = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const width = Math.min(POPOVER_WIDTH, window.innerWidth - SCREEN_MARGIN * 2);
    const left = Math.min(
      Math.max(SCREEN_MARGIN, rect.right - width),
      window.innerWidth - SCREEN_MARGIN - width,
    );
    setPosition({ top: rect.bottom + 7, left });
  }, []);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    measure();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (!panelRef.current?.contains(target) && !triggerRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onEscape);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onEscape);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [measure, open]);

  useEffect(() => {
    if (!open) return;
    const activeLink = panelRef.current?.querySelector<HTMLAnchorElement>('a[aria-current="page"]');
    (activeLink ?? panelRef.current?.querySelector<HTMLAnchorElement>('a'))?.focus();
  }, [open]);

  return (
    <>
      <div className="av-moremenu av-moremodules-trigger">
        <button
          ref={triggerRef}
          type="button"
          className="av-navitem av-moremodules-button"
          data-active={active}
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls={open ? dialogId : undefined}
          onClick={() => {
            measure();
            setOpen(previous => !previous);
          }}
        >
          更多模块 <span className="av-moremodules-chevron" aria-hidden="true">{open ? '▴' : '▾'}</span>
        </button>
      </div>
      {mounted && open ? createPortal(
        <div
          ref={panelRef}
          id={dialogId}
          role="dialog"
          aria-label="更多业务模块"
          className="av-moremodules-panel"
          style={{ top: position.top, left: position.left, width: Math.min(POPOVER_WIDTH, window.innerWidth - SCREEN_MARGIN * 2) }}
        >
          <div className="av-moremodules-heading">
            <strong>更多业务模块</strong>
            <span>共 {modules.length} 个模块</span>
          </div>
          <nav className="av-moremodules-links" aria-label="更多模块导航">
            {modules.map(module => (
              <a
                key={module.href}
                href={module.href}
                className="av-moremodules-link"
                data-active={module.active}
                aria-current={module.active ? 'page' : undefined}
                title={module.description}
                onClick={() => setOpen(false)}
              >
                <span className="av-moremodules-icon" aria-hidden="true">{module.icon}</span>
                <span className="av-moremodules-copy">
                  <strong>{module.label}</strong>
                  <small>{module.description}</small>
                </span>
                {module.active ? <span className="av-moremodules-indicator" aria-hidden="true">●</span> : null}
              </a>
            ))}
          </nav>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
