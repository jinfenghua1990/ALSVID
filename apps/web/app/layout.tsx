import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { RefreshButton } from './_components/refresh-button';
import './globals.css';
import './admin-shell-v2.css';
import './theme.css';
import './theme-legacy.css';

function runtimeEnvironment() {
  return process.env.ALSVID_ENV === 'production' ? 'production' : 'development';
}

export function generateMetadata(): Metadata {
  const environment = runtimeEnvironment();
  return {
    title: environment === 'production' ? 'ALSVID' : '[开发] ALSVID',
    description: 'ALSVID 自行车业务与车辆生命周期管理平台',
  };
}

const themeBootstrap = `
try {
  const saved = localStorage.getItem('alsvid-theme');
  const theme = saved === 'light' || saved === 'dark'
    ? saved
    : (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
} catch (_) {}
`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const environment = runtimeEnvironment();
  const isDevelopment = environment !== 'production';

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body data-alsvid-environment={environment}>
        {isDevelopment ? (
          <div className="environmentBanner" role="status">
            <strong>开发/测试：ALSVID Development</strong>
            <span>当前数据仅用于开发与验收，不属于正式业务数据。</span>
            <RefreshButton />
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
