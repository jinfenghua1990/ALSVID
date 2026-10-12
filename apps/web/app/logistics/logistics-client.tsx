'use client';

import { AppShell } from '@alsvid/ui';
import { navigationFor } from '../app-navigation';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import styles from './logistics.module.css';

type RouteType = 'FACTORY_TO_GERMANY_WAREHOUSE' | 'FACTORY_TO_DEALER_DIRECT';
type ItemKind = 'SKU' | 'VEHICLE';
type PartnerSummary = { id: string; partnerCode: string; displayName: string; countryCode: string | null; roles: string[] };
type PartnerDetail = PartnerSummary & { identifiers: Array<{ id: string; scheme: string; value: string }>; addresses: Array<{ id: string; purpose: string; line1: string; city: string; postalCode: string | null; countryCode: string }> };
type Warehouse = { id: string; code: string; name: string; country_code: string };
type Location = { id: string; warehouse_id: string; warehouse_code: string; warehouse_name: string; code: string; name: string; location_type: string };
type Balance = { item_kind: 'PART' | 'SKU' | 'VEHICLE'; sku_id: string | null; vehicle_id: string | null; location_code: string; warehouse_code: string; location_id: string; unit: string; on_hand: string; reserved: string; available: string; sku: string | null; sku_name: string | null; frame_number: string | null };
type Shipment = { id: string; shipment_number: string; route_type: RouteType; status: string; origin_location_id: string; origin_location_code: string; origin_warehouse_code: string; destination_location_id: string | null; destination_location_code: string | null; destination_warehouse_code: string | null; destination_dealer_partner_id: string | null; dealer_name: string | null; dealer_address_line1: string | null; dealer_city: string | null; carrier_name: string | null; transport_mode: string; incoterm: string | null; booking_reference: string | null; bill_of_lading: string | null; container_reference: string | null; tracking_reference: string | null; planned_etd: string | null; planned_eta: string | null; dispatched_at: string | null; delivered_at: string | null; inventory_received_at: string | null; created_at: string };
type Cargo = { id: string; shipment_id: string; item_kind: ItemKind; sku_id: string | null; vehicle_id: string | null; quantity: string; unit: string; reservation_id: string; reservation_status: string; sku: string | null; sku_name: string | null; frame_number: string | null; vehicle_sku: string | null };
type ShipmentEvent = { id: string; shipment_id: string; event_type: string; occurred_at: string; location_text: string | null; note: string };
type Declaration = { id: string; declaration_code: string; shipment_id: string; direction: 'EXPORT' | 'IMPORT'; jurisdiction: string; declaration_number: string | null; status: string; exporter_name: string | null; importer_name: string | null; importer_of_record_name: string | null; exporter_eori: string | null; importer_eori: string | null; importer_of_record_eori: string | null; commercial_invoice_number: string | null; packing_list_number: string | null; currency: string; created_at: string };
type CustomsLine = { id: string; declaration_id: string; cargo_id: string; item_kind: ItemKind; sku: string | null; frame_number: string | null; origin_country: string; hs_code: string; cn_code: string | null; taric_code: string | null; declared_value: string; duty_rate: string | null; duty_amount: string | null; import_vat_rate: string | null; import_vat_amount: string | null; anti_dumping_rate: string | null; anti_dumping_amount: string | null; countervailing_rate: string | null; countervailing_amount: string | null; operational_fees_amount: string | null };
type CustomsEvent = { id: string; declaration_id: string; event_type: string; occurred_at: string; reference: string | null; note: string };
type Handoff = { id: string; shipment_id: string; cargo_id: string; movement_number: string; item_kind: ItemKind; sku: string | null; frame_number: string | null; destination_warehouse_code: string; destination_location_code: string; received_at: string };
type LogisticsSummary = { shipments: Shipment[]; cargo: Cargo[]; events: ShipmentEvent[]; declarations: Declaration[]; customsLines: CustomsLine[]; customsEvents: CustomsEvent[]; handoffs: Handoff[] };
type InventorySummary = { balances: Balance[] };
type WarehouseSummary = { warehouses: Warehouse[]; locations: Location[] };

const emptyLogistics: LogisticsSummary = { shipments: [], cargo: [], events: [], declarations: [], customsLines: [], customsEvents: [], handoffs: [] };

const shipmentStatusLabels: Record<string, string> = {
  DRAFT: '草稿', RELEASED: '已放行', DISPATCHED: '已发运', IN_TRANSIT: '运输中', DELIVERED: '已交付', CANCELLED: '已取消',
};
const eventLabels: Record<string, string> = {
  BOOKED: '已订舱', CARGO_READY: '货物就绪', DEPARTED: '已启运', IN_TRANSIT: '运输中', ARRIVED_EU: '抵达欧盟', EXCEPTION: '异常', HOLD: '暂扣', RELEASED_FROM_HOLD: '解除暂扣', DELIVERED_GERMANY_WAREHOUSE: '德国仓已交付', DELIVERED_DEALER: '经销商已交付',
  DECLARED: '已申报', HELD: '海关暂扣', CLEARED: '已清关',
};
const transportLabels: Record<string, string> = { SEA: '海运', AIR: '空运', RAIL: '铁路', ROAD: '公路', MULTIMODAL: '多式联运' };
const declarationStatusLabels: Record<string, string> = { DRAFT: '草稿', DECLARED: '已申报', HELD: '暂扣', CLEARED: '已清关', CANCELLED: '已取消' };

function shipmentStatusLabel(value: string) { return shipmentStatusLabels[value] ?? value; }
function eventLabel(value: string) { return eventLabels[value] ?? value; }
function declarationStatusLabel(value: string) { return declarationStatusLabels[value] ?? value; }

export default function LogisticsClient() {
  const router = useRouter();
  const [logistics, setLogistics] = useState<LogisticsSummary>(emptyLogistics);
  const [inventory, setInventory] = useState<InventorySummary>({ balances: [] });
  const [warehouse, setWarehouse] = useState<WarehouseSummary>({ warehouses: [], locations: [] });
  const [partners, setPartners] = useState<PartnerSummary[]>([]);
  const [partnerDetails, setPartnerDetails] = useState<Record<string, PartnerDetail>>({});
  const [route, setRoute] = useState<RouteType>('FACTORY_TO_GERMANY_WAREHOUSE');
  const [dealerId, setDealerId] = useState('');
  const [selectedShipmentId, setSelectedShipmentId] = useState('');
  const [cargoKind, setCargoKind] = useState<ItemKind>('SKU');
  const [selectedDeclarationId, setSelectedDeclarationId] = useState('');
  const [exporterId, setExporterId] = useState('');
  const [importerId, setImporterId] = useState('');
  const [iorId, setIorId] = useState('');
  const [message, setMessage] = useState('');

  async function api(path: string, init?: RequestInit) {
    const headers = new Headers(init?.headers);
    headers.set('content-type', 'application/json');
    const response = await fetch(`/api/control${path}`, { ...init, headers });
    if (response.status === 401) {
      router.push('/login');
      throw new Error('登录状态已过期，请重新登录');
    }
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.message ?? '请求失败');
    return payload.data;
  }

  async function ensurePartner(id: string) {
    if (!id || partnerDetails[id]) return;
    try {
      const detail = await api(`/v1/partners/${id}`);
      setPartnerDetails((current) => ({ ...current, [id]: detail }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法加载合作伙伴详情');
    }
  }

  async function reload() {
    try {
      const [logisticsData, inventoryData, warehouseData, partnerData] = await Promise.all([
        api('/v1/logistics'), api('/v1/inventory'), api('/v1/warehouse'), api('/v1/partners'),
      ]);
      setLogistics(logisticsData);
      setInventory(inventoryData);
      setWarehouse(warehouseData);
      setPartners(partnerData);
      if (!selectedShipmentId && logisticsData.shipments[0]) setSelectedShipmentId(logisticsData.shipments[0].id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '无法加载物流工作台');
    }
  }

  useEffect(() => { void reload(); }, []);

  const warehousesById = useMemo(() => Object.fromEntries(warehouse.warehouses.map((item) => [item.id, item])), [warehouse.warehouses]);
  const cnLocations = warehouse.locations.filter((item) => warehousesById[item.warehouse_id]?.country_code === 'CN');
  const deLocations = warehouse.locations.filter((item) => warehousesById[item.warehouse_id]?.country_code === 'DE');
  const dealers = partners.filter((item) => item.roles.includes('DEALER'));
  const carriers = partners.filter((item) => item.roles.includes('LOGISTICS_PROVIDER'));
  const selectedShipment = logistics.shipments.find((item) => item.id === selectedShipmentId) ?? null;
  const shipmentCargo = selectedShipment ? logistics.cargo.filter((item) => item.shipment_id === selectedShipment.id) : [];
  const shipmentEvents = selectedShipment ? logistics.events.filter((item) => item.shipment_id === selectedShipment.id) : [];
  const shipmentDeclarations = selectedShipment ? logistics.declarations.filter((item) => item.shipment_id === selectedShipment.id) : [];
  const selectedDeclaration = shipmentDeclarations.find((item) => item.id === selectedDeclarationId) ?? shipmentDeclarations[0] ?? null;
  const customsLines = selectedDeclaration ? logistics.customsLines.filter((item) => item.declaration_id === selectedDeclaration.id) : [];
  const customsEvents = selectedDeclaration ? logistics.customsEvents.filter((item) => item.declaration_id === selectedDeclaration.id) : [];
  const dealerAddresses = (partnerDetails[dealerId]?.addresses ?? []).filter((item) => item.purpose === 'SHIPPING');
  const eoris = (partnerId: string) => (partnerDetails[partnerId]?.identifiers ?? []).filter((item) => item.scheme.toUpperCase() === 'EORI');
  const cargoCandidates = selectedShipment ? inventory.balances.filter((row) => row.location_id === selectedShipment.origin_location_id && row.available !== '0' && (row.item_kind === 'SKU' || row.item_kind === 'VEHICLE') && row.item_kind === cargoKind) : [];
  const metric = {
    draft: logistics.shipments.filter((item) => item.status === 'DRAFT').length,
    active: logistics.shipments.filter((item) => !['DRAFT', 'DELIVERED', 'CANCELLED'].includes(item.status)).length,
    delivered: logistics.shipments.filter((item) => item.status === 'DELIVERED').length,
    holds: logistics.events.filter((item) => item.event_type === 'HOLD').length,
  };

  async function action(path: string, body: unknown = {}) {
    try {
      await api(path, { method: 'POST', body: JSON.stringify(body) });
      setMessage('操作已完成。');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '操作失败');
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>, path: string, build: (form: FormData) => unknown) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    try {
      await api(path, { method: 'POST', body: JSON.stringify(build(form)) });
      setMessage('已保存。');
      formElement.reset();
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '保存失败');
    }
  }

  function itemLabel(row: Balance) { return row.sku ?? row.frame_number ?? '未知库存对象'; }
  function cargoLabel(row: Cargo) { return row.sku ?? row.frame_number ?? '未知货物'; }

  return (
    <AppShell navigation={navigationFor('/logistics')} footer="ALSVID · 出口物流">
      <section>
        <header className={styles.header}>
          <div>
            <div className={styles.eyebrow}>出口物流 / EXPORT LOGISTICS</div>
            <h1>一套物流模型，覆盖两条真实交付路线。</h1>
            <p>中国工厂 → 德国仓，以及中国工厂 → 经销商直发，共享同一套物流执行骨架；库存、清关和交付事实仍按实际路线分别记录。</p>
          </div>
        </header>
        {message ? <div className={styles.notice}>{message}</div> : null}

        <div className={styles.metrics}>
          <div><span>草稿</span><b>{metric.draft}</b></div>
          <div><span>执行中</span><b>{metric.active}</b></div>
          <div><span>已交付</span><b>{metric.delivered}</b></div>
          <div><span>暂扣事件</span><b>{metric.holds}</b></div>
        </div>

        <section className={styles.createGrid}>
          <form className={styles.card} onSubmit={(event) => void submit(event, '/v1/logistics/shipments', (form) => ({
            routeType: route,
            originLocationId: form.get('originLocationId'),
            destinationLocationId: route === 'FACTORY_TO_GERMANY_WAREHOUSE' ? form.get('destinationLocationId') : undefined,
            destinationDealerPartnerId: route === 'FACTORY_TO_DEALER_DIRECT' ? dealerId : undefined,
            destinationAddressId: route === 'FACTORY_TO_DEALER_DIRECT' ? form.get('destinationAddressId') : undefined,
            carrierPartnerId: form.get('carrierPartnerId') || undefined,
            transportMode: form.get('transportMode'),
            incoterm: form.get('incoterm') || undefined,
            bookingReference: form.get('bookingReference') || undefined,
            containerReference: form.get('containerReference') || undefined,
            trackingReference: form.get('trackingReference') || undefined,
            plannedEtd: form.get('plannedEtd') || undefined,
            plannedEta: form.get('plannedEta') || undefined,
            note: form.get('note') || undefined,
          }))}>
            <span>运输计划</span><h2>创建出口运输单</h2>
            <select value={route} onChange={(event) => setRoute(event.target.value as RouteType)}>
              <option value="FACTORY_TO_GERMANY_WAREHOUSE">中国工厂 → 德国仓</option>
              <option value="FACTORY_TO_DEALER_DIRECT">中国工厂 → 经销商直发</option>
            </select>
            <select name="originLocationId" required defaultValue=""><option value="" disabled>选择中国发货库位</option>{cnLocations.map((item) => <option key={item.id} value={item.id}>{item.warehouse_code}/{item.code} · {item.name}</option>)}</select>
            {route === 'FACTORY_TO_GERMANY_WAREHOUSE' ? (
              <select name="destinationLocationId" required defaultValue=""><option value="" disabled>选择德国收货库位</option>{deLocations.map((item) => <option key={item.id} value={item.id}>{item.warehouse_code}/{item.code} · {item.name}</option>)}</select>
            ) : (
              <>
                <select value={dealerId} onChange={(event) => { setDealerId(event.target.value); void ensurePartner(event.target.value); }} required><option value="" disabled>选择经销商</option>{dealers.map((item) => <option key={item.id} value={item.id}>{item.partnerCode} · {item.displayName}</option>)}</select>
                <select name="destinationAddressId" required defaultValue=""><option value="" disabled>选择经销商收货地址</option>{dealerAddresses.map((item) => <option key={item.id} value={item.id}>{item.line1}, {item.city} · {item.countryCode}</option>)}</select>
              </>
            )}
            <div className={styles.inline}>
              <select name="carrierPartnerId" defaultValue=""><option value="">承运商 / 货代（可选）</option>{carriers.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select>
              <select name="transportMode" defaultValue="SEA"><option value="SEA">海运</option><option value="AIR">空运</option><option value="RAIL">铁路</option><option value="ROAD">公路</option><option value="MULTIMODAL">多式联运</option></select>
              <select name="incoterm" defaultValue="DAP"><option value="">Incoterm</option><option>DAP</option><option>DDP</option><option>FCA</option><option>FOB</option><option>CIF</option><option>CFR</option><option>EXW</option></select>
            </div>
            <div className={styles.inline}><input name="bookingReference" placeholder="订舱号" /><input name="containerReference" placeholder="集装箱号" /><input name="trackingReference" placeholder="跟踪号" /></div>
            <div className={styles.inline}><label>计划 ETD<input name="plannedEtd" type="datetime-local" /></label><label>计划 ETA<input name="plannedEta" type="datetime-local" /></label></div>
            <input name="note" placeholder="运输备注" />
            <button>创建运输单</button>
          </form>

          <div className={styles.routeRule}>
            <span>路线规则</span>
            <h2>{route === 'FACTORY_TO_GERMANY_WAREHOUSE' ? '德国仓路线' : '经销商直发路线'}</h2>
            {route === 'FACTORY_TO_GERMANY_WAREHOUSE' ? (
              <p>“已交付德国仓”和“德国仓库存入库”是两个独立动作。只有明确执行仓库收货后，德国库存才会增加。</p>
            ) : (
              <p>经销商直发路线不会创建或引用德国仓库库位。经销商完成签收后物流即闭环，也不能触发德国库存收货。</p>
            )}
          </div>
        </section>

        <section className={styles.shipmentGrid}>
          <div className={styles.shipmentList}>
            {logistics.shipments.map((item) => <button key={item.id} className={selectedShipmentId === item.id ? styles.selected : ''} onClick={() => { setSelectedShipmentId(item.id); setSelectedDeclarationId(''); }}>
              <span>{item.route_type === 'FACTORY_TO_GERMANY_WAREHOUSE' ? '德国仓路线' : '经销商直发'}</span>
              <b>{item.shipment_number}</b>
              <small>{item.origin_warehouse_code}/{item.origin_location_code} → {item.destination_warehouse_code ?? item.dealer_name ?? '未设置目的地'} · {shipmentStatusLabel(item.status)}</small>
            </button>)}
            {!logistics.shipments.length ? <p className={styles.empty}>暂无运输单。</p> : null}
          </div>

          {selectedShipment ? (
            <div className={styles.shipmentDetail}>
              <div className={styles.sectionHead}><span>运输单 360</span><h2>{selectedShipment.shipment_number}</h2><p>{selectedShipment.route_type === 'FACTORY_TO_GERMANY_WAREHOUSE' ? `${selectedShipment.origin_warehouse_code} → ${selectedShipment.destination_warehouse_code}` : `${selectedShipment.origin_warehouse_code} → ${selectedShipment.dealer_name}`}</p></div>
              <div className={styles.factGrid}>
                <div><span>状态</span><b>{shipmentStatusLabel(selectedShipment.status)}</b></div>
                <div><span>运输方式</span><b>{transportLabels[selectedShipment.transport_mode] ?? selectedShipment.transport_mode}</b></div>
                <div><span>Incoterm</span><b>{selectedShipment.incoterm ?? '—'}</b></div>
                <div><span>订舱号</span><b>{selectedShipment.booking_reference ?? '—'}</b></div>
                <div><span>计划 ETD</span><b>{selectedShipment.planned_etd ? new Date(selectedShipment.planned_etd).toLocaleString() : '—'}</b></div>
                <div><span>计划 ETA</span><b>{selectedShipment.planned_eta ? new Date(selectedShipment.planned_eta).toLocaleString() : '—'}</b></div>
              </div>
              <div className={styles.actions}>
                {selectedShipment.status === 'DRAFT' ? <><button onClick={() => void action(`/v1/logistics/shipments/${selectedShipment.id}/release`)}>放行运输单</button><button className={styles.secondary} onClick={() => void action(`/v1/logistics/shipments/${selectedShipment.id}/cancel`, { reason: '在物流工作台取消' })}>取消</button></> : null}
                {selectedShipment.status === 'RELEASED' ? <><button onClick={() => void action(`/v1/logistics/shipments/${selectedShipment.id}/dispatch`)}>确认发运</button><button className={styles.secondary} onClick={() => void action(`/v1/logistics/shipments/${selectedShipment.id}/cancel`, { reason: '发运前取消' })}>取消</button></> : null}
                {selectedShipment.route_type === 'FACTORY_TO_GERMANY_WAREHOUSE' && selectedShipment.status === 'DELIVERED' && !selectedShipment.inventory_received_at ? <button onClick={() => void action(`/v1/logistics/shipments/${selectedShipment.id}/receive-germany`)}>确认德国仓入库</button> : null}
              </div>
            </div>
          ) : <div className={styles.shipmentDetail}><p className={styles.empty}>请选择一个运输单。</p></div>}
        </section>

        {selectedShipment ? <>
          <section className={styles.threeCol}>
            <form className={styles.card} onSubmit={(event) => void submit(event, `/v1/logistics/shipments/${selectedShipment.id}/cargo`, (form) => ({ itemKind: cargoKind, itemId: form.get('itemId'), quantity: form.get('quantity'), note: form.get('note') || undefined }))}>
              <span>货物分配</span><h2>预留发货地库存</h2>
              <select value={cargoKind} onChange={(event) => setCargoKind(event.target.value as ItemKind)}><option value="SKU">SKU</option><option value="VEHICLE">整车</option></select>
              <select name="itemId" required defaultValue=""><option value="" disabled>{selectedShipment.origin_warehouse_code}/{selectedShipment.origin_location_code} 可用库存</option>{cargoCandidates.map((row) => <option key={row.sku_id ?? row.vehicle_id ?? ''} value={row.sku_id ?? row.vehicle_id ?? ''}>{itemLabel(row)} · 可用 {row.available} {row.unit}</option>)}</select>
              <input name="quantity" defaultValue={cargoKind === 'VEHICLE' ? '1' : ''} placeholder="数量" required />
              <input name="note" placeholder="货物备注" />
              <button disabled={selectedShipment.status !== 'DRAFT'}>分配并预留库存</button>
            </form>

            <form className={styles.card} onSubmit={(event) => void submit(event, `/v1/logistics/shipments/${selectedShipment.id}/milestones`, (form) => ({ eventType: form.get('eventType'), occurredAt: form.get('occurredAt') || undefined, locationText: form.get('locationText') || undefined, note: form.get('note') || undefined }))}>
              <span>物流里程碑</span><h2>追加实际发生事件</h2>
              <select name="eventType"><option value="BOOKED">已订舱</option><option value="CARGO_READY">货物就绪</option><option value="DEPARTED">已启运</option><option value="IN_TRANSIT">运输中</option><option value="ARRIVED_EU">抵达欧盟</option><option value="EXCEPTION">异常</option><option value="HOLD">暂扣</option><option value="RELEASED_FROM_HOLD">解除暂扣</option>{selectedShipment.route_type === 'FACTORY_TO_GERMANY_WAREHOUSE' ? <option value="DELIVERED_GERMANY_WAREHOUSE">德国仓已交付</option> : <option value="DELIVERED_DEALER">经销商已交付</option>}</select>
              <input name="occurredAt" type="datetime-local" />
              <input name="locationText" placeholder="地点 / 港口 / 站点" />
              <input name="note" placeholder="里程碑备注" />
              <button disabled={['DELIVERED', 'CANCELLED'].includes(selectedShipment.status)}>记录里程碑</button>
            </form>

            <div className={styles.card}>
              <span>已分配货物</span><h2>{shipmentCargo.length} 行</h2>
              {shipmentCargo.map((row) => <div className={styles.compactRow} key={row.id}><div><b>{cargoLabel(row)}</b><small>{row.quantity} {row.unit} · 预留状态 {row.reservation_status}</small></div>{selectedShipment.status === 'DRAFT' ? <button onClick={() => void action(`/v1/logistics/cargo/${row.id}/remove`)}>移除</button> : null}</div>)}
              {!shipmentCargo.length ? <p className={styles.empty}>尚未分配货物。</p> : null}
            </div>
          </section>

          <section className={styles.timeline}>
            <div className={styles.sectionHead}><span>物流时间线</span><h2>计划时间与实际发生事实分开记录</h2></div>
            {shipmentEvents.map((event) => <div className={styles.event} key={event.id}><time>{new Date(event.occurred_at).toLocaleString()}</time><b>{eventLabel(event.event_type)}</b><span>{event.location_text ?? ''}</span><p>{event.note}</p></div>)}
            {!shipmentEvents.length ? <p className={styles.empty}>暂无物流里程碑。</p> : null}
          </section>

          <section className={styles.customsPanel}>
            <div className={styles.sectionHead}><span>海关与合规</span><h2>出口 / 进口申报</h2><p>HS/CN/TARIC、关税、进口 VAT、反倾销 / 反补贴税和操作费用均作为明确事实保存，后续可进入落地成本财务核算。</p></div>
            <div className={styles.customsGrid}>
              <form className={styles.card} onSubmit={(event) => void submit(event, `/v1/logistics/shipments/${selectedShipment.id}/customs`, (form) => ({
                direction: form.get('direction'), jurisdiction: form.get('jurisdiction'), declarationNumber: form.get('declarationNumber') || undefined,
                exporterPartnerId: exporterId || undefined, exporterEoriIdentifierId: form.get('exporterEoriIdentifierId') || undefined,
                importerPartnerId: importerId || undefined, importerEoriIdentifierId: form.get('importerEoriIdentifierId') || undefined,
                importerOfRecordPartnerId: iorId || undefined, importerOfRecordEoriIdentifierId: form.get('iorEoriIdentifierId') || undefined,
                commercialInvoiceNumber: form.get('commercialInvoiceNumber') || undefined, packingListNumber: form.get('packingListNumber') || undefined,
                currency: form.get('currency') || 'EUR', note: form.get('note') || undefined,
              }))}>
                <span>新建海关申报</span>
                <select name="direction"><option value="EXPORT">出口</option><option value="IMPORT">进口</option></select>
                <input name="jurisdiction" placeholder="管辖区域：CN / DE / EU" required />
                <input name="declarationNumber" placeholder="海关申报编号" />
                <select value={exporterId} onChange={(event) => { setExporterId(event.target.value); void ensurePartner(event.target.value); }}><option value="">出口方 Partner</option>{partners.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select>
                <select name="exporterEoriIdentifierId" defaultValue=""><option value="">出口方 EORI</option>{eoris(exporterId).map((item) => <option key={item.id} value={item.id}>{item.value}</option>)}</select>
                <select value={importerId} onChange={(event) => { setImporterId(event.target.value); void ensurePartner(event.target.value); }}><option value="">进口方 Partner</option>{partners.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select>
                <select name="importerEoriIdentifierId" defaultValue=""><option value="">进口方 EORI</option>{eoris(importerId).map((item) => <option key={item.id} value={item.id}>{item.value}</option>)}</select>
                <select value={iorId} onChange={(event) => { setIorId(event.target.value); void ensurePartner(event.target.value); }}><option value="">Importer of Record（IOR）</option>{partners.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select>
                <select name="iorEoriIdentifierId" defaultValue=""><option value="">IOR EORI</option>{eoris(iorId).map((item) => <option key={item.id} value={item.id}>{item.value}</option>)}</select>
                <div className={styles.inline}><input name="commercialInvoiceNumber" placeholder="商业发票号" /><input name="packingListNumber" placeholder="装箱单号" /><input name="currency" defaultValue="EUR" maxLength={3} /></div>
                <input name="note" placeholder="申报备注" />
                <button>创建申报草稿</button>
              </form>

              <div className={styles.declarationList}>
                {shipmentDeclarations.map((item) => <button key={item.id} className={selectedDeclaration?.id === item.id ? styles.selected : ''} onClick={() => setSelectedDeclarationId(item.id)}><span>{item.direction === 'EXPORT' ? '出口' : '进口'} · {item.jurisdiction}</span><b>{item.declaration_code}</b><small>{declarationStatusLabel(item.status)} · {item.declaration_number ?? '暂无外部编号'}</small></button>)}
                {!shipmentDeclarations.length ? <p className={styles.empty}>暂无海关申报。</p> : null}
              </div>

              {selectedDeclaration ? (
                <form className={styles.card} onSubmit={(event) => void submit(event, `/v1/logistics/customs/${selectedDeclaration.id}/lines`, (form) => ({
                  cargoId: form.get('cargoId'), originCountry: form.get('originCountry'), hsCode: form.get('hsCode'), cnCode: form.get('cnCode') || undefined, taricCode: form.get('taricCode') || undefined,
                  declaredValue: form.get('declaredValue') || undefined, dutyRate: form.get('dutyRate') || undefined, dutyAmount: form.get('dutyAmount') || undefined,
                  importVatRate: form.get('importVatRate') || undefined, importVatAmount: form.get('importVatAmount') || undefined,
                  antiDumpingRate: form.get('antiDumpingRate') || undefined, antiDumpingAmount: form.get('antiDumpingAmount') || undefined,
                  countervailingRate: form.get('countervailingRate') || undefined, countervailingAmount: form.get('countervailingAmount') || undefined,
                  operationalFeesAmount: form.get('operationalFeesAmount') || undefined,
                }))}>
                  <span>归类 / 税费事实</span><h2>{selectedDeclaration.declaration_code}</h2>
                  <select name="cargoId" required defaultValue=""><option value="" disabled>选择货物行</option>{shipmentCargo.map((row) => <option key={row.id} value={row.id}>{cargoLabel(row)}</option>)}</select>
                  <div className={styles.inline}><input name="originCountry" defaultValue="CN" maxLength={2} required /><input name="hsCode" placeholder="HS 编码" required /><input name="cnCode" placeholder="CN 编码" /><input name="taricCode" placeholder="TARIC" /></div>
                  <input name="declaredValue" placeholder="申报价值" />
                  <div className={styles.inline}><input name="dutyRate" placeholder="关税税率" /><input name="dutyAmount" placeholder="关税金额" /></div>
                  <div className={styles.inline}><input name="importVatRate" placeholder="进口 VAT 税率" /><input name="importVatAmount" placeholder="进口 VAT 金额" /></div>
                  <div className={styles.inline}><input name="antiDumpingRate" placeholder="反倾销税率" /><input name="antiDumpingAmount" placeholder="反倾销税金额" /></div>
                  <div className={styles.inline}><input name="countervailingRate" placeholder="反补贴税率" /><input name="countervailingAmount" placeholder="反补贴税金额" /></div>
                  <input name="operationalFeesAmount" placeholder="清关操作费用" />
                  <button disabled={selectedDeclaration.status !== 'DRAFT'}>添加申报明细</button>
                </form>
              ) : <div className={styles.card}><p className={styles.empty}>请选择或创建一个海关申报。</p></div>}
            </div>

            {selectedDeclaration ? <>
              <div className={styles.customsActions}>
                <b>{selectedDeclaration.direction === 'EXPORT' ? '出口' : '进口'} · {declarationStatusLabel(selectedDeclaration.status)}</b>
                <button onClick={() => void action(`/v1/logistics/customs/${selectedDeclaration.id}/events`, { eventType: 'DECLARED' })} disabled={selectedDeclaration.status !== 'DRAFT'}>确认申报</button>
                <button onClick={() => void action(`/v1/logistics/customs/${selectedDeclaration.id}/events`, { eventType: 'HELD' })}>记录暂扣</button>
                <button onClick={() => void action(`/v1/logistics/customs/${selectedDeclaration.id}/events`, { eventType: 'RELEASED_FROM_HOLD' })}>解除暂扣</button>
                <button onClick={() => void action(`/v1/logistics/customs/${selectedDeclaration.id}/events`, { eventType: 'CLEARED' })}>确认清关</button>
              </div>
              <div className={styles.customsFacts}>{customsLines.map((line) => <div key={line.id}><b>{line.sku ?? line.frame_number}</b><span>HS {line.hs_code} · CN {line.cn_code ?? '—'} · TARIC {line.taric_code ?? '—'}</span><small>申报价值 {line.declared_value} · 关税 {line.duty_amount ?? '—'} · VAT {line.import_vat_amount ?? '—'} · 反倾销 {line.anti_dumping_amount ?? '—'} · 反补贴 {line.countervailing_amount ?? '—'} · 操作费 {line.operational_fees_amount ?? '—'}</small></div>)}</div>
              <div className={styles.customsTimeline}>{customsEvents.map((item) => <div key={item.id}><time>{new Date(item.occurred_at).toLocaleString()}</time><b>{eventLabel(item.event_type)}</b><span>{item.reference ?? ''}</span></div>)}</div>
            </> : null}
          </section>
        </> : null}
      </section>
    </AppShell>
  );
}
