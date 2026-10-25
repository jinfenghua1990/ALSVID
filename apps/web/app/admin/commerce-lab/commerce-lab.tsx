'use client';

import { useState } from 'react';
import styles from './commerce-lab.module.css';

type View = 'overview' | 'storefront' | 'admin' | 'mapping';
type Item = { id: string; name: string; image: string; price: number; published: boolean };
type Line = { id: string; name: string; quantity: number; price: number };
type DemoOrder = { id: string; total: number; lines: Line[]; status: '待处理' | '已标记处理' };
const initialItems: Item[] = [
  { id: 'demo-fc1', name: 'ALSVID FC1', image: '/home/original/fc1-product.webp', price: 2599, published: true },
  { id: 'demo-fc2', name: 'ALSVID FC2', image: '/products/fc2/side-studio-1536.webp', price: 2899, published: true },
];
const money = (value: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
const viewNames: Record<View, string> = {
  overview: '方案与现有系统', storefront: '购买页面预览', admin: '中文后台预览', mapping: '融合接口规划',
};
const mapping = [
  ['商品 / SKU', '商品列表、详情、规格选择', '商品、规格与发布管理', '映射 ID、图片、规格；校验发布状态'],
  ['价格 / 货币', '欧元价格与金额展示', '售价、优惠设置', '服务端计算价格、税费和配送；样例金额不作为真实售价'],
  ['购物车', '数量与选项、购物袋', '购物车接口', '重写 Medusa 专用调用；不能只修改 API 地址'],
  ['订单', '结账、订单查询', '中文订单列表与处理', '确定唯一订单写入者、状态映射与幂等规则'],
  ['支付 / 退款', '获批 PSP 的托管支付', '支付状态与退款结果', '签名验证、金额绑定、重复回调与对账；本区不接支付'],
  ['身份 / 库存', '客户登录与可售校验', '会员 / 库存操作', '独立鉴权与资源范围；不共享原系统 Cookie 或直接写原数据库'],
];

export function CommerceLab() {
  const [view, setView] = useState<View>('overview');
  const [items, setItems] = useState<Item[]>(initialItems);
  const [cart, setCart] = useState<Line[]>([]);
  const [orders, setOrders] = useState<DemoOrder[]>([]);
  const [adminTab, setAdminTab] = useState<'products' | 'orders'>('products');
  const [query, setQuery] = useState('');
  const [mobile, setMobile] = useState(false);
  const [bagOpen, setBagOpen] = useState(false);
  const [notice, setNotice] = useState('');
  const [selected, setSelected] = useState<Item | null>(null);
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function add(item: Item) {
    setCart(previous => {
      const current = previous.find(line => line.id === item.id);
      if (current) return previous.map(line => line.id === item.id ? { ...line, quantity: Math.min(9, line.quantity + 1) } : line);
      return [...previous, { id: item.id, name: item.name, quantity: 1, price: item.price }];
    });
    setNotice(item.name + ' 已加入独立演示购物袋');
  }
  function createDemoOrder() {
    if (!cart.length) return;
    const latestLines = cart.map(line => ({ ...line, price: items.find(item => item.id === line.id)?.price ?? line.price }));
    if (latestLines.some(line => !items.find(item => item.id === line.id)?.published)) {
      setNotice('部分演示商品已下架，请清空购物袋后重新选择'); return;
    }
    setOrders(previous => [...previous, {
      id: 'DEMO-' + String(previous.length + 1).padStart(3, '0'), lines: latestLines,
      total: latestLines.reduce((sum, line) => sum + line.quantity * line.price, 0), status: '待处理',
    }]);
    setCart([]); setBagOpen(false); setAdminTab('orders'); setView('admin');
    setNotice('已生成浏览器内演示单。没有真实下单、支付或库存操作。');
  }
  function reset() {
    setItems(initialItems); setCart([]); setOrders([]); setQuery(''); setSelected(null);
    setNotice('独立演示已重置，原系统未受影响。');
  }
  return <div className={styles.lab} data-commerce-lab>
    <div className={styles.disclosure}>
      <strong>独立交互样机 · 尚未运行 Medusa / CRMEB 服务</strong>
      <span>示例价格与订单仅用于比较；刷新即清空，不读取或同步真实客户、订单、库存与购物袋。</span>
    </div>
    <nav className={styles.tabs} aria-label="商城方案对比">
      {(Object.keys(viewNames) as View[]).map(key => <button type="button" key={key}
        aria-pressed={view === key} onClick={() => { setView(key); setSelected(null); }}>{viewNames[key]}</button>)}
      <button type="button" onClick={reset}>重置演示</button>
    </nav>
    <p className={styles.notice} role="status">{notice}</p>

    {view === 'overview' && <div className={styles.overview}>
      <section className={styles.intro}><span>ALSVID COMMERCE LAB</span><h2>前台看品牌，后台看效率。</h2>
        <p>把你选择的购买页面和中文运营方式放在同一个隔离空间比较，再决定是否正式采用。</p>
        <div className={styles.actions}><button type="button" onClick={() => setView('storefront')}>体验新购买页面 →</button>
          <button type="button" onClick={() => setView('admin')}>体验中文运营后台 →</button></div>
      </section>
      <div className={styles.columns}>
        <section className={styles.panel}><span className={styles.badge}>原有系统 · 独立保留</span><h3>现在的 ALSVID</h3>
          <p>已有品牌官网、商品发布、价格和订单工作区。当前公开购物袋是非约束性预览；页面或接口存在不代表真实交易已验收。</p>
          <div className={styles.links}><a href="https://www.alsvidbike.com/zh/bikes" target="_blank" rel="noopener noreferrer">查看现有购买页面 ↗</a>
            <a href="/admin/ecommerce" target="_blank" rel="noopener noreferrer">查看现有电商后台 ↗</a>
            <a href="/admin/architecture" target="_blank" rel="noopener noreferrer">查看当前系统架构 ↗</a></div>
        </section>
        <section className={styles.panel}><span className={styles.badge}>候选融合方案 · 未接通</span><h3>Medusa 前台 × CRMEB 后端</h3>
          <p>前台参考 Medusa 的商品、购物袋和结账体验，中文运营参考 CRMEB。两个项目不直接兼容，需要替换前台数据调用并开发适配层。</p>
          <div className={styles.links}><a href="https://github.com/medusajs/dtc-starter" target="_blank" rel="noopener noreferrer">Medusa 当前 DTC 模板 ↗</a>
            <a href="https://github.com/crmeb/CRMEB" target="_blank" rel="noopener noreferrer">CRMEB 源码 ↗</a>
            <a href="http://v6.crmeb.net/admin" target="_blank" rel="noopener noreferrer">CRMEB 官方演示 ↗</a></div>
        </section>
      </div>
      <section className={styles.panel}><h3>你可以实际比较的交互</h3>
        <ol><li>在购买页面加入演示商品，生成一张演示单。</li><li>进入中文后台查看同一张演示单，修改演示商品名称、价格或上架状态。</li><li>回到购买页面查看变化；全部状态仅存在于当前浏览器页面内。</li></ol>
        <p>正式融合仍需独立确定数据写入权威、账号、支付、数据库与部署边界；本样机不代表原生源码已经整合。</p>
      </section>
    </div>}

    {view === 'storefront' && <section aria-label="独立购买页面预览">
      <div className={styles.previewTools}><span>Medusa 风格购买流程 · ALSVID 视觉样机</span>
        <button type="button" aria-pressed={mobile} onClick={() => setMobile(value => !value)}>{mobile ? '桌面宽度' : '手机宽度'}</button></div>
      <div className={styles.store} data-mobile={mobile}>
        <div className={styles.storeBanner}>DESIGNED FOR YOUR NEXT CHAPTER · 演示商城</div>
        <header className={styles.storeHeader}><strong>ALSVID</strong><span>探索你的下一程</span>
          <button type="button" onClick={() => setBagOpen(value => !value)}>购物袋 ({count})</button></header>
        <div className={styles.hero}><div><small>MOVE FREELY. LIVE FULLY.</small><h2>每一程，<br />都有新可能。</h2>
          <p>折叠、探索、出发。找到属于你的 ALSVID。</p><span>产品图为现有参考图片 · 售价为演示数据</span></div>
          <img src="/home/original/fc1-product.webp" alt="FC1 参考产品图片" width={600} height={400} /></div>
        <div className={styles.catalogHeading}><h3>探索车型</h3><span>{items.filter(item => item.published).length} 款演示商品</span></div>
        <div className={styles.productGrid}>{items.filter(item => item.published).map(item => <article className={styles.product} key={item.id}>
          <button type="button" className={styles.imageButton} onClick={() => setSelected(item)} aria-label={'查看 ' + item.name}>
            <img src={item.image} alt={item.name + ' 参考图片'} width={500} height={340} /></button>
          <small>独立演示商品</small><h3>{item.name}</h3><p>车型配置与最终量产规格待确认</p>
          <div className={styles.productFooter}><strong>{money(item.price)} <small>示例价</small></strong>
            <button type="button" onClick={() => add(item)}>加入演示购物袋</button></div>
        </article>)}</div>
        {!items.some(item => item.published) && <p className={styles.empty}>演示商品已全部下架，可到中文后台重新上架。</p>}
        {selected && <section className={styles.bag} aria-label="演示商品详情"><button type="button" onClick={() => setSelected(null)}>关闭详情</button>
          <h3>{selected.name}</h3><p>图片和名称来自样机，配置、价格、库存均未作为真实可售资料核验。</p>
          <button type="button" onClick={() => add(items.find(item => item.id === selected.id) ?? selected)}>加入演示购物袋</button></section>}
        {bagOpen && <section className={styles.bag} aria-label="演示购物袋"><h3>演示购物袋</h3>
          {cart.length ? cart.map(line => <div className={styles.bagLine} key={line.id}><span>{line.name}</span>
            <label>数量 <input type="number" min={1} max={9} value={line.quantity} onChange={event => {
              const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= 9)
                setCart(previous => previous.map(item => item.id === line.id ? { ...item, quantity: value } : item));
            }} /></label>
            <button type="button" onClick={() => setCart(previous => previous.filter(item => item.id !== line.id))}>移除</button></div>) : <p>购物袋为空</p>}
          <p>示例商品合计：{money(total)} · 非最终应付金额</p><p>不收集地址或卡号，不创建真实订单。生成后可在本区中文后台查看。</p>
          <button type="button" disabled={!cart.length} onClick={createDemoOrder}>生成演示单并查看后台</button>
        </section>}
      </div>
    </section>}

    {view === 'admin' && <section className={styles.demoAdmin} aria-label="CRMEB 风格中文后台预览">
      <aside className={styles.demoRail}><strong>ALSVID 运营</strong><small>CRMEB 风格样机</small>
        <button type="button" aria-pressed={adminTab === 'products'} onClick={() => setAdminTab('products')}>商品管理</button>
        <button type="button" aria-pressed={adminTab === 'orders'} onClick={() => setAdminTab('orders')}>订单管理 ({orders.length})</button>
        <button type="button" onClick={() => setView('storefront')}>预览商城 ↗</button>
      </aside>
      <div className={styles.adminWork}>
        <div className={styles.adminHeading}><div><small>独立演示数据</small><h2>{adminTab === 'products' ? '商品管理' : '订单管理'}</h2></div>
          <span className={styles.badge}>未连接 CRMEB API</span></div>
        {adminTab === 'products' ? <>
          <label className={styles.search}>搜索演示商品 <input value={query} onChange={event => setQuery(event.target.value)} placeholder="输入车型名称" /></label>
          <div className={styles.tableWrap}><table><thead><tr><th>商品</th><th>演示名称</th><th>示例售价 EUR</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>{items.filter(item => item.name.toLowerCase().includes(query.toLowerCase())).map(item => <tr key={item.id}>
              <td><img src={item.image} alt="" width={74} height={50} /></td>
              <td><input aria-label={item.id + ' 名称'} value={item.name} maxLength={60} onChange={event => setItems(previous => previous.map(p => p.id === item.id ? { ...p, name: event.target.value } : p))} /></td>
              <td><input aria-label={item.id + ' 示例售价'} type="number" min={1} max={99999} step={1} value={item.price} onChange={event => {
                const value = Number(event.target.value); if (Number.isInteger(value) && value >= 1 && value <= 99999) {
                  setItems(previous => previous.map(p => p.id === item.id ? { ...p, price: value } : p));
                  setCart(previous => previous.map(line => line.id === item.id ? { ...line, price: value } : line));
                }
              }} /></td><td>{item.published ? '演示上架' : '演示下架'}</td>
              <td><button type="button" onClick={() => setItems(previous => previous.map(p => p.id === item.id ? { ...p, published: !p.published } : p))}>{item.published ? '下架' : '上架'}</button></td>
            </tr>)}</tbody></table></div>
          <p>修改即时反映到本区购买页面，不保存到服务器；不会修改现有产品主数据、官网发布或价格。</p>
        </> : <>
          <div className={styles.tableWrap}><table><thead><tr><th>演示单号</th><th>商品</th><th>示例合计</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>{orders.map(order => <tr key={order.id}><td>{order.id}</td><td>{order.lines.map(line => line.name + ' × ' + line.quantity).join('、')}</td>
              <td>{money(order.total)}</td><td>{order.status}</td><td><button type="button" disabled={order.status === '已标记处理'}
                onClick={() => setOrders(previous => previous.map(item => item.id === order.id ? { ...item, status: '已标记处理' } : item))}>演示标记处理</button></td></tr>)}</tbody></table></div>
          {!orders.length && <div className={styles.empty}><h3>还没有演示单</h3><p>先在购买页面加入商品，再生成演示单。</p>
            <button type="button" onClick={() => setView('storefront')}>去体验购买页面</button></div>}
          <p>演示处理不代表付款、发货、库存扣减或真实订单状态变更。</p>
        </>}
      </div>
    </section>}

    {view === 'mapping' && <section className={styles.panel}><span className={styles.badge}>技术规划 · 尚未实施 API 对接</span>
      <h2>两套项目怎样真正融合</h2><p>Medusa 当前 DTC 前台调用其专用后端。使用 CRMEB 作为电商引擎时，需替换这些调用并统一契约；不能运行两个订单主系统同时写同一业务。</p>
      <div className={styles.tableWrap}><table><thead><tr><th>领域</th><th>购买页面</th><th>CRMEB 候选能力</th><th>必须完成的适配</th></tr></thead>
        <tbody>{mapping.map(row => <tr key={row[0]}>{row.map((cell, index) => index === 0 ? <th scope="row" key={index}>{cell}</th> : <td key={index}>{cell}</td>)}</tr>)}</tbody></table></div>
      <p>正式试验须使用独立数据、账号、凭据和 API 命名空间，逐项验证欧元、税费、配送、退款与订单状态。采用 CRMEB 所需的 PHP / MySQL 等运行依赖须单独评估，不改变现有 PostgreSQL 业务权威。</p>
      <p>旧 medusajs/nextjs-starter-medusa 已归档。后续源码评估以当前 dtc-starter 为起点，并先确认对应版本与许可证。</p>
    </section>}
  </div>;
}
