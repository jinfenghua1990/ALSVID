'use client';

export function RefreshButton() {
  return (
    <button type="button" className="refreshButton" onClick={() => window.location.reload()}>
      更新页面
    </button>
  );
}
