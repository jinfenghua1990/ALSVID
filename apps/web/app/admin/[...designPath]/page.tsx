import { notFound } from 'next/navigation';
import AdminScreen from '../../_design/renderer';
import { screens } from '../../_design';

export default async function DesignPage({ params }: { params: Promise<{ designPath: string[] }> }) {
  const { designPath } = await params;
  const route = '/admin/' + designPath.join('/');
  const screen = screens.find(item => item.route === route);
  if (!screen) notFound();
  return <AdminScreen screen={screen} />;
}
