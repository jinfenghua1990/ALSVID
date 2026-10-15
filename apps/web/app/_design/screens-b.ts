import type { Screen } from './types';

export const screensB: Screen[] = [
  {
    id: 'settings',
    area: '设置',
    route: '/admin/settings',
    title: '角色与权限',
    subtitle: '人员角色、权限范围与系统集成总览',
    actions: ['+ 新增角色'],
    secondary: [
      { group: '人员与权限', items: ['员工管理', '用户与访问权限', '角色与权限'] },
      { group: '安全与审计', items: ['安全与登录', '审计日志'] },
      { group: '系统与集成', items: ['通信与邮件', '系统集成', '环境与基础设施'] },
    ],
    blocks: [
      {
        kind: 'kpis',
        items: [
          { value: '12 套', label: '活跃角色数' },
          { value: '248 人', label: '用户总数' },
          { value: '8 个', label: '已启用集成', tone: 'brand' },
          { value: '168 人次', label: '今日登录' },
        ],
      },
      {
        kind: 'table',
        title: '角色与权限矩阵',
        columns: ['角色', '用户数', '权限范围', '可访问模块', '最后修改', '状态'],
        rows: [
          ['超级管理员', '8 人', '全局', '所有模块 + 系统设置', '11-08 14:21', { text: '启用', tone: 'good' }],
          ['销售经理', '12 人', '销售域', '产品 / 订单 / 客户 / 经销商', '11-04 09:15', { text: '启用', tone: 'good' }],
          ['售后主管', '14 人', '售后域', '售后 / 客户 / 经销商', '10-28 11:42', { text: '启用', tone: 'good' }],
          ['仓库主管', '6 人', '库存域', '库存 / 生产 / 供应链', '11-02 16:08', { text: '启用', tone: 'good' }],
          ['数据分析师', '9 人', '只读', '数据 / 生产 / 库存分析', '11-06 10:30', { text: '启用', tone: 'good' }],
          ['财务审计', '4 人', '审计域', '所有模块只读 · 审计日志', '11-01 17:55', { text: '启用', tone: 'good' }],
        ],
      },
    ],
  },

  {
    id: 'analytics',
    area: '数据',
    route: '/admin/analytics',
    title: '数据总览',
    subtitle: '销售、生产、库存、售后多维度指标一览',
    actions: ['↓ 导出报告'],
    secondary: [
      {
        group: '数据分析',
        items: ['数据总览', '销售分析', '生产与库存分析', '售后与经销商分析'],
      },
    ],
    blocks: [
      {
        kind: 'kpis',
        items: [
          { value: '¥ 24.8M', label: '本月营收' },
          { value: '+ 18.2%', label: '环比上月', tone: 'good' },
          { value: '+ 42.6%', label: '同比去年', tone: 'good' },
          { value: '78.4%', label: '年度目标达成', tone: 'brand' },
        ],
      },
      {
        kind: 'table',
        title: '各系列销售业绩',
        hint: '近 30 天 · 近 90 天 · 本季度',
        filters: ['近 30 天', '近 90 天', '本季度'],
        columns: ['系列', '销量', '销售额', '同比', '占比'],
        rows: [
          ['FC 系列', '18,420 辆', '¥ 6.84M', { text: '+ 28.4%', tone: 'good' }, { text: '27.6%', tone: 'brand' }],
          ['CT 系列', '12,860 辆', '¥ 4.62M', { text: '+ 22.1%', tone: 'good' }, { text: '22.4%', tone: 'brand' }],
          ['FT 系列', '9,480 辆', '¥ 2.84M', { text: '+ 18.6%', tone: 'good' }, { text: '18.2%', tone: 'brand' }],
          ['GT 系列', '4,820 辆', '¥ 1.96M', { text: '+ 12.3%', tone: 'good' }, { text: '11.8%', tone: 'brand' }],
        ],
      },
      {
        kind: 'bars',
        title: '系列销售额占比',
        hint: '按本月销售额口径统计',
        items: [
          { name: 'FC 系列', percent: 27.6, value: '¥ 6.84M' },
          { name: 'CT 系列', percent: 22.4, value: '¥ 4.62M' },
          { name: 'FT 系列', percent: 18.2, value: '¥ 2.84M' },
          { name: 'GT 系列', percent: 11.8, value: '¥ 1.96M' },
        ],
      },
    ],
  },

  {
    id: 'supply',
    area: '供应链',
    route: '/admin/supply',
    title: '供应链中心',
    subtitle: '供应商生态 · 采购履约 · 零件供应全链路',
    actions: ['+ 新增供应商'],
    secondary: [
      { group: '供应商体系', items: ['供应商列表', '供应商档案', '认证管理', '合作状态'] },
      { group: '采购管理', items: ['采购申请', '采购订单', '到货管理', '入库记录'] },
      { group: '零件供应', items: ['零件目录', '供应关系', '交付计划', '缺料预警'] },
      { group: '供应商分析', items: ['质量分析', '交付分析', '成本分析', '综合评分'] },
    ],
    blocks: [
      {
        kind: 'kpis',
        items: [
          { value: '86 家', label: '供应商数量', delta: '-2 本月退出' },
          { value: '24 单', label: '待到货订单', delta: '↑ 8% 同比' },
          { value: '3 项', label: '供应风险', delta: '↑ 1 项 环比', tone: 'warn' },
          { value: '¥ 4.82M', label: '采购金额', delta: '↑ 15.3% 同比', tone: 'good' },
          { value: '5 批', label: '质量异常', delta: '↓ 2 批 改善', tone: 'good' },
          { value: '15 天', label: '平均交付周期', delta: '↓ 1.5 天 改善', tone: 'good' },
        ],
      },
      {
        kind: 'flow',
        title: '采购流程',
        hint: '关联生产需求与入库记录',
        steps: [
          { label: '生产需求' },
          { label: '采购申请' },
          { label: '审批' },
          { label: '采购订单' },
          { label: '供应商发货' },
          { label: '质量检验' },
          { label: '入库' },
        ],
      },
      {
        kind: 'list',
        title: '供应商分级',
        items: [
          { name: '战略供应商', value: '6 家', tag: '核心' },
          { name: '核心供应商', value: '18 家' },
          { name: '普通供应商', value: '52 家' },
          { name: '待认证供应商', value: '10 家', tag: '待认证', tone: 'warn' },
        ],
      },
      {
        kind: 'bars',
        title: '成本分析 · FC1',
        items: [
          { name: '车架', percent: 30 },
          { name: '电池', percent: 25 },
          { name: '电机', percent: 15 },
          { name: '电子', percent: 10 },
          { name: '其他', percent: 20 },
        ],
      },
      {
        kind: 'table',
        title: '零件供应关系',
        columns: ['零件', '供应商', '产品', 'BOM'],
        rows: [
          ['电池包', '供应商 A', 'FC1·CT1', 'V2.0'],
          ['电机总成', '供应商 B', 'CT1', 'V1.0'],
          ['碳纤维车架', '供应商 C', 'FC1 Pro', 'V2.0'],
          ['控制器', '供应商 D', 'GT1', 'V1.0'],
          ['显示屏', '供应商 E', 'FT1', 'V1.0'],
        ],
      },
      {
        kind: 'table',
        title: '采购订单',
        search: '🔍 搜索采购单 / 零件 / 供应商',
        columns: ['采购单', '供应商', '零件', '数量', '关联产品', '交付日期', '状态'],
        rows: [
          ['PO-2026-101', '供应商 A', '电池包', '500', 'FC1', '10-30', { text: '运输中', tone: 'brand' }],
          ['PO-2026-102', '供应商 B', '电机总成', '300', 'CT1', '11-05', { text: '已入库', tone: 'good' }],
          ['PO-2026-103', '供应商 C', '碳纤维车架', '200', 'FC1 Pro', '11-12', { text: '生产中', tone: 'brand' }],
          ['PO-2026-104', '供应商 D', '控制器', '400', 'GT1', '11-18', { text: '已下单', tone: 'neutral' }],
          ['PO-2026-105', '供应商 E', '显示屏', '350', 'FT1', '11-22', { text: '审批中', tone: 'warn' }],
        ],
      },
    ],
  },

  {
    id: 'after-sales',
    area: '售后',
    route: '/admin/after-sales',
    title: '售后中心',
    subtitle: '车辆生命周期服务 · VIN 档案 · 保修 · 维修 · 配件全链路',
    actions: ['↓ 导出', '+ 新建工单'],
    secondary: [
      { group: '车辆查询', items: ['VIN查询', '车辆档案', '出厂记录'] },
      { group: '保修管理', items: ['保修申请', '保修审核', '保修状态'] },
      { group: '维修管理', items: ['维修工单', '维修进度', '完成记录'] },
      { group: '配件服务', items: ['配件申请', '配件库存', '配件更换记录'] },
      { group: '服务分析', items: ['售后数据', '故障分析', '服务质量'] },
    ],
    blocks: [
      {
        kind: 'kpis',
        items: [
          { value: '48 单', label: '售后工单', delta: '↓ 12% 改善', tone: 'good' },
          { value: '23 单', label: '处理中', delta: '↓ 8% 改善', tone: 'good' },
          { value: '2.4 小时', label: '平均响应时间', delta: '↓ 0.6h 改善', tone: 'good' },
          { value: '0.42%', label: '故障率', delta: '↓ 0.08 改善', tone: 'good' },
          { value: '3.6 天', label: '平均维修时间', delta: '↓ 0.4 天 改善', tone: 'good' },
          { value: '¥ 12.6K', label: '配件消耗', delta: '↑ 18% 同比' },
        ],
      },
      {
        kind: 'search',
        title: 'VIN 快速查询',
        hint: '售后第一步 · 查这台车是谁、什么配置、有没有保修',
        placeholder: '🔍 输入 VIN / 车架号 / 订单号 / 客户姓名 / 手机号',
        fields: [
          '车型：FC1 Pro',
          'VIN：ALS00001',
          '生产日期：2026-10-10',
          'BOM 版本：V2.0',
          '车主：王先生',
          '保修：有效',
        ],
      },
      {
        kind: 'bars',
        title: '故障分析 · FC1 Pro',
        items: [
          { name: '电池连接', percent: 35 },
          { name: '控制器', percent: 20 },
          { name: '电机异响', percent: 15 },
          { name: '刹车系统', percent: 12 },
          { name: '其他', percent: 18 },
        ],
      },
      {
        kind: 'list',
        title: '工单状态',
        items: [
          { name: '待审核', value: '6 单', tag: '待处理', tone: 'warn' },
          { name: '已确认', value: '4 单' },
          { name: '维修中', value: '9 单', tag: '进行中', tone: 'brand' },
          { name: '等待配件', value: '5 单', tone: 'warn' },
          { name: '完成', value: '21 单', tone: 'good' },
          { name: '关闭', value: '3 单' },
        ],
      },
      {
        kind: 'table',
        title: '配件服务 · 申请联动库存',
        columns: ['配件', '数量', '库存', '审批'],
        rows: [
          ['电池组', '1', { text: '有库存', tone: 'good' }, { text: '已批准', tone: 'good' }],
          ['控制器', '1', { text: '有库存', tone: 'good' }, { text: '已批准', tone: 'good' }],
          ['充电器', '2', { text: '需采购', tone: 'bad' }, { text: '待批准', tone: 'warn' }],
          ['线束', '3', { text: '有库存', tone: 'good' }, { text: '已出库', tone: 'brand' }],
          ['传感器', '1', { text: '有库存', tone: 'good' }, { text: '已批准', tone: 'good' }],
        ],
      },
      {
        kind: 'table',
        title: '工单列表',
        search: '🔍 搜索工单 / VIN / 负责人',
        columns: ['工单号', 'VIN', '车型', '问题', '处理状态', '负责人'],
        rows: [
          ['SR-2026-001', 'ALS00001', 'FC1 Pro', '电池异常', { text: '维修中', tone: 'brand' }, '李工'],
          ['SR-2026-002', 'ALC00001', 'CT1', '刹车异响', { text: '等待配件', tone: 'warn' }, '王工'],
          ['SR-2026-003', 'ALF00001', 'FT1', '固件升级', { text: '已确认', tone: 'neutral' }, '李工'],
          ['SR-2026-004', 'ALS00002', 'FC1 Pro', '车架检测', { text: '待审核', tone: 'warn' }, '张工'],
          ['SR-2026-005', 'ALG00001', 'GT1', '电机异响', { text: '完成', tone: 'good' }, '王工'],
        ],
      },
    ],
  },
];
