import { redirect } from 'next/navigation';
import { requirePortalSession } from '../../_lib/portal-access';
import { getOwnerGarage } from '../_data/garage-live';

// 资料与配件已经迁移到车辆详情下的「说明书 / 配件」，
// 而这个页面现在没有导航入口。保留路由，避免外部链接直接 404。
export default async function MyLibraryPage() {
  await requirePortalSession('my', '/my/library');

  const { vehicles } = await getOwnerGarage();
  redirect(vehicles[0] ? `/my/vehicles/${vehicles[0].id}/manual` : '/my/vehicles');
}
