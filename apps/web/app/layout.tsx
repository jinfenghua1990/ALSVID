import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { RefreshButton } from './_components/refresh-button';
import './globals.css';
import './admin-shell-v2.css';

function runtimeEnvironment() {
  return process.env.ALSVID_ENV === 'production' ? 'production' : 'test';
}

export function generateMetadata(): Metadata {
  const environment = runtimeEnvironment();
  return {
    title: environment === 'production' ? 'ALSVID' : '[测试] ALSVID',
    description: 'ALSVID 自行车业务与车辆生命周期管理平台',
  };
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const environment = runtimeEnvironment();
  const isTest = environment !== 'production';

  return (
    <html lang="zh-CN">
      <body data-alsvid-environment={environment}>
        {isTest ? (
          <div className="environmentBanner" role="status">
            <strong>测试环境</strong>
            <span>当前数据仅用于开发与验收，不属于正式业务数据。</span>
            <RefreshButton />
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
