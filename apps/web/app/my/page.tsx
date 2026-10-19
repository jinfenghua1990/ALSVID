import { requirePortalSession } from '../_lib/portal-access';
import { OwnerShell } from '../_components/owner-shell';
import { getOwnerGarage } from './_data/garage-live';
import { OwnerDashboard } from './_components/owner-dashboard';

export default async function MyALSVIDPage() {
  const session = await requirePortalSession('my', '/my');
  const { updatedAt, vehicles } = await getOwnerGarage();
  return <OwnerShell activeHref="/my"><OwnerDashboard key={session.userId} displayName={session.displayName} userKey={session.userId} updatedAt={updatedAt} vehicles={vehicles} /></OwnerShell>;
}
