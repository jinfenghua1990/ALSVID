import Link from 'next/link';
import { AppShell } from '@alsvid/ui';
import { navigationFor } from '../app-navigation';

const steps = ['生产', '质检', '入库', '出货', '经销商', '客户', '售后'];

export default function Vehicle360Page() {
  return (
    <AppShell navigation={navigationFor('/vehicle360')} footer="ALSVID · Vehicle 360">
      <main style={{ padding: '48px 0' }}>
        <p style={{ letterSpacing: '.12em', color: '#888' }}>VEHICLE 360</p>
        <h1>车辆全生命周期追踪</h1>
        <p style={{ maxWidth: 720, lineHeight: 1.7 }}>
          Vehicle 360 用于记录每一台 ALSVID 车辆从生产到售后的业务事实。
          当前阶段不假设车辆联网，不提供虚假的实时健康监控。
        </p>
        <section style={{ display: 'grid', gap: 12, marginTop: 32 }}>
          {steps.map((step, index) => (
            <div key={step} style={{ padding: 18, border: '1px solid #e5e5e5', borderRadius: 12 }}>
              <strong>{String(index + 1).padStart(2, '0')} · {step}</strong>
            </div>
          ))}
        </section>
        <p style={{ marginTop: 32 }}><Link href="/product">返回产品中心 →</Link></p>
      </main>
    </AppShell>
  );
}
