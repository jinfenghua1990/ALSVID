import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { RefreshButton } from './_components/refresh-button';
import './globals.css';
import './admin-shell-v2.css';
import './admin-refinements.css';
import './theme.css';
import './theme-legacy.css';

function runtimeEnvironment() {
  return process.env.ALSVID_ENV === 'production' ? 'production' : 'development';
}

export function generateMetadata(): Metadata {
  const environment = runtimeEnvironment();
  return {
    title: environment === 'production' ? 'ALSVID' : 'ALSVID（本地开发）',
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

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const requestHeaders = await headers();
  const requestLocale = requestHeaders.get('x-alsvid-locale');
  const documentLanguage = requestLocale === 'de' || requestLocale === 'en' ? requestLocale : 'zh-CN';
  const environment = runtimeEnvironment();
  const isDevelopment = environment !== 'production';

  return (
    <html lang={documentLanguage} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
      </head>
      <body data-alsvid-environment={environment}>
        {isDevelopment ? (
          <div className="environmentBanner" role="status">
            <strong>本地开发环境</strong>
            <span>非正式环境，当前数据不属于正式业务数据。</span>
            <RefreshButton />
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
