import { redirect } from 'next/navigation';

/** Compatibility entrypoint. Canonical finance workspace lives in Admin. */
export default function FinanceLegacyPage() {
  redirect('/admin/finance');
}
