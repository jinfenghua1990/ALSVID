import { redirect } from 'next/navigation';

// 门户启动页已提升为首页 `/`，旧地址保留重定向。
export default function PortalLauncherRedirect() {
  redirect('/');
}
