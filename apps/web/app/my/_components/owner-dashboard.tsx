'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BikeVisual } from './bike-visual';
import { latestService, warrantyRemainingDays, type OwnerVehicle } from '../_data/garage';
import styles from '../owner-portal.module.css';
import garage from '../garage.module.css';

const quickLinks = [
  ['保修', '⛨', 'warranty', '查看保修范围与剩余天数'],
  ['服务记录', '≡', 'service', '保养与检查的完整时间线'],
  ['维修', '✦', 'repairs', '维修工单与处理状态'],
  ['说明书', '▤', 'manual', '按车型匹配的手册与文件'],
  ['配件', '＋', 'accessories', '只推荐兼容这台车的配件'],
] as const;

function statusDotClass(status: string) {
  if (status === 'attention') return `${garage.statusDot} ${garage.statusDotWarn}`;
  if (status === 'in_service') return `${garage.statusDot} ${garage.statusDotBusy}`;
  return garage.statusDot;
}

export function OwnerDashboard({ displayName, userKey, updatedAt, vehicles }: { displayName: string; userKey: string; updatedAt: string; vehicles: OwnerVehicle[] }) {
  const storageKey = 'alsvid:garage:vehicle:' + userKey;
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const primary = vehicles.find(vehicle => vehicle.id === selectedId) ?? vehicles[0] ?? null;
  const selectedIndex = primary ? vehicles.findIndex(vehicle => vehicle.id === primary.id) : 0;
  const others = vehicles.filter(vehicle => vehicle.id !== primary?.id);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      setSelectedId(vehicles.some(vehicle => vehicle.id === saved) ? saved : null);
    } catch { setSelectedId(null); }
  }, [storageKey, vehicles]);
  function selectVehicle(index: number) {
    const vehicle = vehicles[index];
    if (!vehicle) return;
    setSelectedId(vehicle.id);
    try { localStorage.setItem(storageKey, vehicle.id); } catch { /* Storage is optional. */ }
  }
  function stepVehicle(direction: number) {
    if (vehicles.length > 1) selectVehicle((selectedIndex + direction + vehicles.length) % vehicles.length);
  }
  return (
      <div className={styles.page}>
        <header>
          <p className={styles.eyebrow}>My ALSVID · Owner center</p>
          <h1 className={styles.display} style={{ marginTop: 18 }}>欢迎回来，{displayName}。</h1>
          <p className={styles.lede}>你的 ALSVID 车辆身份、保修、服务与售后，全部围绕一个 VIN 长期保存。</p>
        </header>

        {primary ? (
          <section className={garage.hero} aria-label="我的车辆" aria-roledescription="轮播">
            <div className={garage.heroTop}>
              <div>
                <p className={styles.eyebrow}>我的车辆 · 共 {vehicles.length} 辆</p>
                <h2 className={garage.heroTitle} aria-live="polite" aria-atomic="true">{primary.model}</h2>
                <p className={garage.heroSub}>{primary.variant} · {primary.colorway}</p>
              </div>
              <span className={garage.statusPill}>
                <span className={statusDotClass(primary.status)} aria-hidden="true" />
                车辆状态 · {primary.statusLabel}
              </span>
            </div>

            <div className={garage.stage}
              tabIndex={vehicles.length > 1 ? 0 : undefined}
              aria-label={vehicles.length > 1 ? '车辆展示，可使用左右方向键或滑动切换车辆' : '车辆展示'}
              style={{ touchAction: 'pan-y pinch-zoom' }}
              onKeyDown={event => {
                if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); stepVehicle(event.key === 'ArrowLeft' ? -1 : 1); }
              }}
              onPointerDown={event => {
                if (event.pointerType === 'touch') { touchStart.current = { x: event.clientX, y: event.clientY }; event.currentTarget.setPointerCapture(event.pointerId); }
              }}
              onPointerCancel={() => { touchStart.current = null; }}
              onPointerUp={event => {
                const start = touchStart.current; touchStart.current = null;
                if (!start || event.pointerType !== 'touch') return;
                const dx = event.clientX - start.x, dy = event.clientY - start.y;
                if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) stepVehicle(dx < 0 ? 1 : -1);
              }}>
              <BikeVisual tone={primary.tone} image={primary.image} label={primary.model} />
            </div>

            {vehicles.length > 1 ? (
              <div className={garage.vehicleSwitcher}>
                <button className={garage.switchArrow} type="button" aria-label="上一辆车" onClick={() => stepVehicle(-1)}>←</button>
                <div className={garage.switchPages}>
                  <span className={garage.switchCount} aria-live="polite">{selectedIndex + 1} / {vehicles.length}</span>
                  <div className={garage.switchDots} role="group" aria-label="选择车辆">
                    {vehicles.map((vehicle, index) => (
                      <button key={vehicle.id} type="button" className={garage.switchDot}
                        aria-label={'切换到 ' + vehicle.model + '，VIN 尾号 ' + vehicle.vin.slice(-4)}
                        aria-pressed={vehicle.id === primary.id} onClick={() => selectVehicle(index)} />
                    ))}
                  </div>
                  <span className={garage.swipeHint}>左右滑动切换车辆</span>
                </div>
                <button className={garage.switchArrow} type="button" aria-label="下一辆车" onClick={() => stepVehicle(1)}>→</button>
                <Link className={garage.switchAll} href="/my/vehicles">查看全部</Link>
              </div>
            ) : null}
            <div className={garage.specBar}>
              <div className={garage.specCell}>
                <span>Vin</span>
                <strong>{primary.vin}</strong>
              </div>
              <div className={garage.specCell}>
                <span>Frame</span>
                <strong>{primary.frameNumber}</strong>
              </div>
              <div className={garage.specCell}>
                <span>Purchased</span>
                <strong>{primary.purchaseDate}</strong>
              </div>
              <div className={garage.specCell}>
                <span>Warranty</span>
                <strong>{primary.warranty.end ? `${warrantyRemainingDays(primary)} 天` : '待核验'}</strong>
              </div>
            </div>
          </section>
        ) : (
          <section className={garage.hero}>
            <div className={garage.heroTop}>
              <div>
                <p className={styles.eyebrow}>Your garage</p>
                <h2 className={garage.heroTitle}>车库还是空的</h2>
                <p className={garage.heroSub}>绑定你的第一台 ALSVID。</p>
              </div>
            </div>
            <div className={garage.stage}>
              <BikeVisual tone="blue" label="ALSVID bicycle outline" />
            </div>
            <div className={garage.specBar}>
              <div className={garage.specCell} style={{ gridColumn: '1 / -1' }}>
                <span>Notice</span>
                <strong>我们只会在车辆身份与所有权关系确认后，把车辆加入你的车库。</strong>
              </div>
            </div>
          </section>
        )}

        <section>
          <div className={garage.sectionHead}>
            <div>
              <h2 className={garage.sectionTitle}>快捷入口</h2>
              <p className={garage.sectionSubtle}>所有服务都以具体车辆为入口。</p>
            </div>
            <Link className={styles.secondaryAction} href={primary ? `/my/vehicles/${primary.id}` : '/my/vehicles'}>
              查看车辆详情
            </Link>
          </div>
          <div className={garage.tileGrid}>
            {quickLinks.map(([title, icon, section, note]) => (
              <Link
                className={garage.tile}
                href={primary ? `/my/vehicles/${primary.id}/${section}` : '/my/vehicles'}
                key={title}
              >
                <span className={garage.tileIcon} aria-hidden="true">{icon}</span>
                <span>
                  <strong>{title}</strong>
                  <small>{note}</small>
                </span>
              </Link>
            ))}
            <Link className={`${garage.tile} ${garage.tileAccent}`} href={primary ? '/my/service/new?vehicle=' + encodeURIComponent(primary.id) : '/my/service/new'}>
              <span className={garage.tileIcon} aria-hidden="true">↗</span>
              <span>
                <strong>售后申请</strong>
                <small>带上车辆 VIN 提交，无需重复填写。</small>
              </span>
            </Link>
          </div>
        </section>

        {others.length > 0 ? (
          <section>
            <div className={garage.sectionHead}>
              <div>
                <h2 className={garage.sectionTitle}>车库中的其他车辆</h2>
                <p className={garage.sectionSubtle}>也可以从这里查看其他车辆的详情。</p>
              </div>
              <Link className={styles.secondaryAction} href="/my/vehicles">全部车辆</Link>
            </div>
            <div className={garage.vehicleGrid}>
              {others.map((vehicle) => (
                <Link className={garage.vehicleCard} href={`/my/vehicles/${vehicle.id}`} key={vehicle.id}>
                  <div className={garage.cardStage}>
                    <BikeVisual tone={vehicle.tone} image={vehicle.image} label={vehicle.model} />
                  </div>
                  <div className={garage.cardBody}>
                    <div>
                      <h3>{vehicle.model}</h3>
                      <p className={garage.cardMeta}>{vehicle.variant} · {vehicle.colorway}</p>
                    </div>
                    <div className={garage.kv}>
                      <div className={garage.kvRow}><span>VIN</span><strong>{vehicle.vin}</strong></div>
                      <div className={garage.kvRow}>
                        <span>保修</span>
                        <strong>{vehicle.warranty.active ? `有效 · 剩 ${warrantyRemainingDays(vehicle)} 天` : '待核验'}</strong>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section className={styles.splitGrid}>
          <article className={styles.panel}>
            <h3>最近动态</h3>
            <p>交付、保修激活、服务和维修完成后，会在这里形成车辆生命周期时间线。</p>
            {primary ? (
              <div className={garage.timeline}>
                {primary.services.slice(0, 3).map((record) => (
                  <div className={garage.timelineItem} key={record.id}>
                    <span className={garage.timelineDate}>{record.date}</span>
                    <div className={garage.timelineBody}>
                      <strong>{record.title}</strong>
                      <p>{record.detail}</p>
                      <div className={garage.timelineMeta}>{record.location}</div>
                    </div>
                  </div>
                ))}
                {primary.services.length === 0 ? <div className={garage.empty}>这台车还没有动态。</div> : null}
              </div>
            ) : (
              <div className={styles.emptyList}>绑定车辆后显示真实车辆动态。</div>
            )}
          </article>

          <article className={styles.panel}>
            <h3>车主状态</h3>
            <p>账户身份与车辆所有权相互独立。</p>
            <div className={garage.kv}>
              <div className={garage.kvRow}><span>账户</span><strong>已登录</strong></div>
              <div className={garage.kvRow}>
                <span>车辆</span>
                <strong>{vehicles.length > 0 ? `${vehicles.length} 台` : '尚未绑定'}</strong>
              </div>
              <div className={garage.kvRow}>
                <span>最近服务</span>
                <strong>{primary && latestService(primary) ? latestService(primary)!.date : '暂无'}</strong>
              </div>
              <div className={garage.kvRow}><span>数据更新</span><strong>{updatedAt}</strong></div>
            </div>
          </article>
        </section>

        <div className={garage.previewNotice}>
          当前车库通过 ALSVID 授权接口读取。未核验的交付、保修、VIN 和颜色资料标记为待核验，不以示例数据代替真实记录。
        </div>
      </div>
  );
}
