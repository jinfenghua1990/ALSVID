import type { Screen } from './types';

export const screensA: Screen[] = [
  {
    id: 'workbench',
    area: '工作台',
    route: '/admin',
    title: '工作台',
    subtitle: '跨模块经营概览、待办与异常集中处理',
    blocks: [
      {
        kind: 'kpis',
        items: [
          { value: '—', label: '待处理事项', delta: '真实审批与任务数据尚未接入' },
          { value: '—', label: '未解决异常', delta: '显示有来源且在权限范围内的异常', tone: 'warn' },
          { value: '—', label: 'Shopify 同步', delta: '最近成功同步时间：暂无数据' },
          { value: '—', label: 'WMS 同步', delta: '仓库执行状态由 WMS 提供' },
        ],
      },
      {
        kind: 'shortcuts',
        title: '快速进入业务模块',
        items: [
          { label: '产品与工程', description: '平台、型号、SKU 与 BOM', href: '/product' },
          { label: '订单与履约事实', description: '查看渠道订单关联与交付状态', href: '/admin/orders' },
          { label: '生产与车辆', description: '计划、工单、质检与 VIN', href: '/admin/production' },
          { label: '库存与仓储', description: '库存台账、预留和 WMS 状态', href: '/admin/inventory' },
          { label: '经销商运营', description: '内部渠道关系与合作状态', href: '/admin/dealers' },
          { label: '售后与保修', description: '服务、维修与车辆售后事实', href: '/admin/after-sales' },
        ],
      },
      {
        kind: 'timeline',
        title: '业务动态',
        tabs: ['全部', 'Shopify', '生产', '库存', '售后', '系统'],
        items: [],
        emptyMessage: '暂无已接入的业务动态。接入来源后将显示更新时间、业务记录和来源链接。',
      },
      {
        kind: 'trend',
        title: '数据分析',
        tabs: ['订单趋势', '生产趋势', '库存趋势', '售后趋势'],
        bars: [],
        emptyMessage: '趋势指标尚未接入真实业务数据。订单与支付以 Shopify 为准，仓库执行以 WMS 为准。',
      },
      {
        kind: 'tasks',
        title: '最近任务',
        items: [],
        emptyMessage: '真实待办已改由工作台「最近任务 · 已接入业务」读取授权 API；本块仅为设计占位。',
      },
    ],
  },

  {
    id: 'product',
    area: '产品',
    route: '/admin/product',
    title: '产品中心',
    subtitle: '产品平台 · 型号 / 配置 / SKU · BOM 与零件库',
    actions: ['导出', '新建型号'],
    secondary: [
      { group: '产品组合', items: ['FC Platform', 'CT Platform', 'FT Platform', 'GT Platform'] },
      { group: '平台管理', items: ['产品平台', '技术平台'] },
      { group: '型号管理', items: ['型号', '配置', 'SKU'] },
      { group: '工程管理', items: ['BOM', '零件库', '工程文件', '版本控制'] },
      { group: '生命周期', items: ['开发中', '量产', '停产', '归档'] },
    ],
    blocks: [
      {
        kind: 'list',
        title: '产品系列',
        hint: '四大平台 · 覆盖城市通勤到长途骑行',
        items: [
          { name: 'FC Platform', value: '折叠城市系列', extra: '在产 4 个型号', tag: '主力' },
          { name: 'CT Platform', value: '城市通勤系列', extra: '在产 3 个型号' },
          { name: 'FT Platform', value: '长途旅行系列', extra: '在产 2 个型号' },
          { name: 'GT Platform', value: '高性能系列', extra: '开发中 1 个型号', tag: '开发中', tone: 'warn' },
        ],
      },
      {
        kind: 'table',
        title: '型号列表',
        hint: '平台 · 配置 · SKU 与工程状态',
        search: '搜索型号、配置或 SKU',
        filters: ['全部', 'FC', 'CT', 'FT', 'GT'],
        columns: ['型号', '平台', '配置', 'SKU', 'BOM 版本', '状态'],
        rows: [
          ['FC1', 'FC Platform', 'Standard · 折叠版', 'FC1-STD-BLK', 'V2.0', { text: '量产', tone: 'good' }],
          ['FC1 Pro', 'FC Platform', 'Pro · 碳纤维', 'FC1-PRO-BLK', 'V2.0', { text: '量产', tone: 'good' }],
          ['CT1', 'CT Platform', 'Standard · 通勤版', 'CT1-STD-WHT', 'V1.0', { text: '量产', tone: 'good' }],
          ['FT1', 'FT Platform', 'Standard · 旅行版', 'FT1-STD-YLW', 'V1.0', { text: '量产', tone: 'good' }],
          ['GT1', 'GT Platform', 'Standard · 性能版', 'GT1-STD-BLU', { text: '待建立', tone: 'warn' }, { text: '开发中', tone: 'warn' }],
        ],
      },
    ],
  },

  {
    id: 'orders',
    area: '订单',
    route: '/admin/orders',
    title: '订单管理',
    subtitle: '全部渠道订单与履约状态',
    actions: ['导出', '新建订单'],
    secondary: [
      { group: '销售订单', items: ['全部订单', 'B2C消费者订单', 'B2B经销商订单', '配件订单'] },
      { group: '生产关联', items: ['待排产订单', '生产中订单', '待交付订单'] },
      { group: '履约管理', items: ['发货管理', '物流跟踪', '交付完成'] },
      { group: '售后订单', items: ['维修订单', '保养订单', '配件补发'] },
    ],
    blocks: [
      {
        kind: 'table',
        title: '订单列表',
        search: '搜索订单号 / 客户 / 经销商 / 车型 / SKU / VIN',
        filters: ['全部', '待发货', '运输中', '已送达'],
        columns: ['订单号', '订单类型', '客户 / 经销商', '车型', 'VIN 状态', '金额', '生产状态', '交付状态'],
        rows: [
          ['AL-2026-0184', { text: 'B2C', tone: 'brand' }, '王先生', 'FC1 Pro', { text: '待绑定', tone: 'warn' }, '¥12,680', '生产完成', { text: '运输中', tone: 'brand' }],
          ['AL-2026-0183', { text: 'B2B', tone: 'brand' }, '华东骑行生活馆', 'CT1', { text: '批量', tone: 'neutral' }, '¥86,400', { text: '生产中', tone: 'brand' }, { text: '待交付', tone: 'warn' }],
          ['AL-2026-0182', { text: 'B2C', tone: 'brand' }, '李女士', 'CT1', { text: '已绑定', tone: 'good' }, '¥6,340', '无需生产', { text: '已送达', tone: 'good' }],
          ['AL-2026-0181', { text: '配件', tone: 'neutral' }, '张先生', '—', '—', '¥860', '无需生产', { text: '已送达', tone: 'good' }],
        ],
      },
    ],
  },

  {
    id: 'production',
    area: '生产',
    route: '/admin/production',
    title: '生产管理',
    subtitle: '真实生产订单、装配、质检与车辆出生',
    actions: [],
    secondary: [
      { group: '生产制造', items: ['生产工作台', '生产订单', '装配与质检', '车辆档案'] },
    ],
    blocks: [],
  },

  {
    id: 'inventory',
    area: '库存',
    route: '/admin/inventory',
    title: '库存管理',
    subtitle: '成品 · 零件 · 仓库与预警',
    actions: ['盘点', '新建调拨'],
    secondary: [
      { group: '整车库存', items: ['成品车辆', '待交付车辆', '经销商库存'] },
      { group: '物料库存', items: ['零件库存', '半成品库存', '原材料库存'] },
      { group: '仓储管理', items: ['仓库管理', '库位管理', '库存调拨'] },
      { group: '库存分析', items: ['库存预警', '周转分析', '呆滞库存'] },
    ],
    blocks: [
      {
        kind: 'kpis',
        items: [
          { value: '128 台', label: '整车库存' },
          { value: '80 台', label: '可销售库存', tone: 'good' },
          { value: '30 台', label: '已预留库存' },
          { value: '18 台', label: '待交付车辆', tone: 'brand' },
          { value: '¥8.6M', label: '库存金额' },
          { value: '4.2 次/月', label: '库存周转率', tone: 'good' },
        ],
      },
      {
        kind: 'table',
        title: '整车库存列表',
        search: '搜索 VIN、型号或 SKU',
        filters: ['全部', '可销售', '已预留', '待交付'],
        columns: ['型号', 'SKU', 'VIN 范围', '仓库', '数量', '库存状态'],
        rows: [
          ['FC1 Pro', 'FC1-PRO-BLK', 'AL0001-AL0050', '上海仓', '50 台', { text: '可销售', tone: 'good' }],
          ['CT1', 'CT1-STD-WHT', 'CT0001-CT0040', '上海仓', '40 台', { text: '可销售', tone: 'good' }],
          ['FT1', 'FT1-STD-YLW', 'FT0001-FT0018', '北京仓', '18 台', { text: '待交付', tone: 'brand' }],
          ['GT1', 'GT1-STD-BLU', 'GT0001-GT0010', '广州仓', '10 台', { text: '质检', tone: 'warn' }],
          ['FC1', 'FC1-STD-BLK', 'AL0101-AL0110', '成都仓', '10 台', { text: '已预留', tone: 'neutral' }],
        ],
      },
      {
        kind: 'table',
        title: '零件库存',
        hint: '低于安全库存的物料会在此预警',
        columns: ['零件编号', '名称', '供应商', 'BOM 关联', '库存', '安全库存', '状态'],
        rows: [
          ['PT-001', 'EPDM 原料', '供应商 A', 'FC1 V2.0', '46 kg', '100 kg', { text: '低于安全值', tone: 'bad' }],
          ['PT-002', '电机总成', '供应商 B', 'FC1 V2.0', '18 部', '40 部', { text: '预警', tone: 'warn' }],
          ['PT-003', '碳纤维车架', '供应商 C', 'FC1 V2.0', '62 件', '50 件', { text: '正常', tone: 'good' }],
          ['PT-004', '电池模组', '供应商 D', 'FC1 V2.0 / CT1 V1.0', '24 组', '60 组', { text: '低于安全值', tone: 'bad' }],
        ],
      },
      {
        kind: 'table',
        title: '库存调拨',
        columns: ['调拨单', '路径', '数量', '状态'],
        rows: [
          ['TR-001', '上海仓 → 北京仓', '20 台', { text: '运输中', tone: 'brand' }],
          ['TR-002', '华南仓 → 上海仓', '30 台', { text: '已入库', tone: 'good' }],
          ['TR-003', '上海仓 → 成都仓', '15 台', { text: '审批中', tone: 'warn' }],
        ],
      },
      {
        kind: 'table',
        title: '经销商库存',
        columns: ['经销商', '主力车型', '库存', '已售 / 待补货'],
        rows: [
          ['华东骑行生活馆', 'FC1 Pro', '8 台', '20 台 / 5 台'],
          ['华南骑行联盟', 'CT1', '12 台', '15 台 / 3 台'],
          ['北京迅骑', 'FT1', '6 台', '9 台 / 4 台'],
        ],
      },
    ],
  },
];
