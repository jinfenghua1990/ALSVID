import { requirePortalSession } from '../_lib/portal-access';

export const dynamic = 'force-dynamic';

export default async function AdminDesignPreviewPage() {
  await requirePortalSession('admin', '/admin-preview');

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#eef2f8',
        padding: '16px',
      }}
    >
      <iframe
        title="ALSVID 后台设计预览"
        src="/admin-preview/index.html#/"
        style={{
          display: 'block',
          width: '100%',
          minHeight: 'calc(100vh - 32px)',
          border: '1px solid #d9e0ec',
          borderRadius: '14px',
          background: '#fff',
        }}
      />
    </main>
  );
}
