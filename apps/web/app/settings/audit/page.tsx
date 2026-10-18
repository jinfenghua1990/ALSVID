import { redirect } from 'next/navigation';

/** Compatibility entrypoint. The canonical Admin page reads actual authorized data. */
export default function AuditLegacyPage() {
  redirect('/admin/settings');
}
