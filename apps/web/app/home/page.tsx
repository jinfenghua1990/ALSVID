import type { Metadata } from 'next';
import { HomePage } from '../_components/home/home-page';

export const metadata: Metadata = {
  title: 'ALSVID — 官方首页',
  description: 'ALSVID 官方网站首页：产品平台、旗舰车型 FC1、折叠体验与核心技术。',
};

/** 官方首页直连预览路由：Admin「官方首页」快捷链接与本地开发预览入口。 */
export default function HomePreviewPage() {
  return <HomePage myUrl="/my" dealerUrl="/dealer" />;
}
