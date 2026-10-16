// Reviewed Ardot presentation corrections. Keep reimports consistent with the UI.
const sourcePages = {
  'product/new/platform': '19:2456', 'product/new/model': '123:1',
  'product/new/configuration': '123:2', 'product/new/sku': '123:3', 'product/new/bom': '123:4',
  'production/new/model': '19:2461', 'production/new/bom': '123:5',
  'production/new/schedule': '123:6', 'production/new/confirm': '123:7',
  'production/new/success': '123:8', 'production/new/shortage': '123:9', 'production/new/failure': '123:10',
  'dealers/purchase/request': '55:719', 'dealers/purchase/approval': '123:11',
  'dealers/purchase/fulfillment': '123:12', 'dealers/purchase/received': '123:13',
};

function refineScreens(screens) {
  const at = route => screens.find(screen => screen.route === `/admin/${route}`);
  at('product').subtitle = '平台 · 型号 · 配置与工程资料 ｜ 示例数据';
  const dealers = at('dealers');
  dealers.subtitle = '全球经销商网络运营 · 采购 / 库存 / 售后能力一览 ｜ 示例数据';
  const region = dealers.blocks.findIndex(block => block.title === '区域授权');
  dealers.blocks[region] = {
    kind: 'bars', title: '区域授权', hint: '示例数据 · 本月销售占比；各区域合计 100%',
    items: [
      { name: '华东', percent: 32.4, value: '32.4%', extra: '¥6.02M · 96 家', tag: '已授权', tone: 'good' },
      { name: '华南', percent: 22.1, value: '22.1%', extra: '¥4.11M · 82 家', tag: '已授权', tone: 'good' },
      { name: '华北', percent: 16.8, value: '16.8%', extra: '¥3.13M · 74 家', tag: '已授权', tone: 'good' },
      { name: '西南', percent: 12.3, value: '12.3%', extra: '¥2.29M · 62 家', tag: '调整中', tone: 'warn' },
      { name: '华中', percent: 9.2, value: '9.2%', extra: '¥1.71M · 54 家', tag: '调整中', tone: 'warn' },
      { name: '东北', percent: 7.2, value: '7.2%', extra: '¥1.34M · 44 家', tag: '待续约', tone: 'bad' },
    ],
  };
  // Existing imported rows put dealer name before region; headers must agree.
  const table = dealers.blocks.find(block => block.kind === 'table' && block.columns.includes('采购金额'));
  table.columns[0] = '经销商';
  table.columns[1] = '区域';
  const analytics = at('analytics');
  // Superseded cached sales totals cannot coexist with the reviewed 200-unit sample.
  analytics.blocks = analytics.blocks.filter(block => !(block.kind === 'table' && block.title === '细分表'));
  const ranking = analytics.blocks.findIndex(block => block.title === '产品销售排行 · 原讨论样例');
  analytics.blocks[ranking] = {
    kind: 'bars', title: '产品销售排行 · 原讨论样例',
    hint: '演示合计 200 台；不代表本月真实销量。GT1 为研发阶段，销量待核实。',
    items: [{ name: 'FC1 Pro', percent: 60, value: '120 台' }, { name: 'CT1', percent: 40, value: '80 台' }],
  };
  return screens;
}

module.exports = { refineScreens, sourcePages };
