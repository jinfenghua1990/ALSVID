import { redirect } from 'next/navigation';
/** Preserve the existing Admin shortcut while using the public localized page. */
export default function HomePreviewPage() {
  redirect('/de/');
}
