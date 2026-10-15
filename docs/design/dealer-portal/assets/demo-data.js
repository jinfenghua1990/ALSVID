/* ============================================================
   ALSVID Dealer Portal — Demo Data Source
   ------------------------------------------------------------
   ⚠️ 仅用于 UI 演示，非真实业务数据。
   默认关闭；开启后由 app.js 注入页面。
   真实环境应删除本文件，改由 ALSVID API 提供数据。
   ============================================================ */

window.ALSVID_DEMO = {
  dealer: {
    name: "ALSVID California Dealer",
    short: "California Dealer",
    region: "California, US",
    code: "DLR-CA-0142",
    tier: "Premium Partner",
    status: "Active Dealer",
    initials: "CD",
  },

  stats: {
    pendingOrders: { value: 12, caption: "2 项待您确认" },
    shipping: { value: 5, caption: "最近更新 2 小时前" },
    awaitingDelivery: { value: 8, caption: "预计本月交付 5 台" },
    afterSales: { value: 3, caption: "1 项待补充材料" },
  },

  purchaseRequests: [
    {
      id: "PR-2026-0184",
      items: "FC1 Pro × 20",
      qty: 20,
      amount: "待决策",
      status: "Submitted",
      date: "2026-10-12",
    },
    {
      id: "PR-2026-0181",
      items: "CT2 × 12 / Brake Kit × 30",
      qty: 42,
      amount: "待决策",
      status: "Confirmed",
      date: "2026-10-08",
    },
    {
      id: "PR-2026-0177",
      items: "GT1 Pro × 6",
      qty: 6,
      amount: "待决策",
      status: "Draft",
      date: "2026-10-05",
    },
    {
      id: "PR-2026-0170",
      items: "Charger Gen3 × 50",
      qty: 50,
      amount: "待决策",
      status: "Completed",
      date: "2026-09-28",
    },
  ],

  orders: [
    {
      id: "PO-2026-0412",
      type: "Vehicle Order",
      product: "FC1 Pro",
      qty: 20,
      amount: "待决策",
      status: "Production",
      date: "2026-10-12",
      eta: "2026-12",
    },
    {
      id: "PO-2026-0408",
      type: "Vehicle Order",
      product: "CT2",
      qty: 12,
      amount: "待决策",
      status: "Shipping",
      date: "2026-10-06",
      eta: "2026-11",
    },
    {
      id: "PO-2026-0401",
      type: "Accessory Order",
      product: "Brake Kit Gen2",
      qty: 30,
      amount: "待决策",
      status: "Confirmed",
      date: "2026-09-30",
      eta: "2026-11",
    },
    {
      id: "PO-2026-0396",
      type: "Vehicle Order",
      product: "GT1 Pro",
      qty: 8,
      amount: "待决策",
      status: "Pending Approval",
      date: "2026-09-24",
      eta: "2027-01",
    },
    {
      id: "PO-2026-0388",
      type: "Vehicle Order",
      product: "FT3",
      qty: 10,
      amount: "待决策",
      status: "Delivered",
      date: "2026-09-15",
      eta: "已交付",
    },
  ],

  vehicles: [
    {
      vin: "ALSFC1P24N0001042",
      model: "FC1 Pro",
      color: "Black",
      status: "Shipping",
      date: "2026-11-08",
    },
    {
      vin: "ALSFC1P24N0001043",
      model: "FC1 Pro",
      color: "White",
      status: "Allocated",
      date: "2026-11-22",
    },
    {
      vin: "ALSCT2X25N0002211",
      model: "CT2",
      color: "Slate",
      status: "Received",
      date: "2026-10-20",
    },
    {
      vin: "ALSGT1P23N0000455",
      model: "GT1 Pro",
      color: "Green",
      status: "Delivered",
      date: "2026-09-30",
    },
    {
      vin: "ALSFT3S24N0001180",
      model: "FT3",
      color: "Black",
      status: "Delivered",
      date: "2026-09-18",
    },
  ],

  afterSales: [
    {
      id: "AS-2026-0092",
      vin: "ALSCT2X25N0002211",
      model: "CT2",
      issue: "Rear brake noise under load",
      status: "Reviewing",
      date: "2026-10-13",
    },
    {
      id: "AS-2026-0089",
      vin: "ALSFT3S24N0001180",
      model: "FT3",
      issue: "Battery charge drops below 80%",
      status: "Approved",
      date: "2026-10-09",
    },
    {
      id: "AS-2026-0084",
      vin: "ALSGT1P23N0000455",
      model: "GT1 Pro",
      issue: "Display panel flickering",
      status: "Repairing",
      date: "2026-10-02",
    },
    {
      id: "AS-2026-0078",
      vin: "ALSFT3S24N0001172",
      model: "FT3",
      issue: "Charger port cover loose",
      status: "Completed",
      date: "2026-09-22",
    },
  ],

  availability: [
    { model: "FC1 Pro", series: "Road Performance", status: "Available", next: "November", lead: "4–6 weeks" },
    { model: "FC1", series: "Road Performance", status: "Available", next: "November", lead: "4–6 weeks" },
    { model: "CT2", series: "Urban Commute", status: "Limited", next: "January", lead: "8–10 weeks" },
    { model: "FT3", series: "All-Terrain", status: "Available", next: "December", lead: "5–7 weeks" },
    { model: "GT1 Pro", series: "Gravel Touring", status: "Pre-order", next: "February", lead: "10–12 weeks" },
  ],

  notifications: [
    {
      title: "PO-2026-0412 已进入生产",
      body: "FC1 Pro × 20，预计产出 2026-12",
      time: "2 小时前",
      unread: true,
    },
    {
      title: "售后申请 AS-2026-0092 需要补充材料",
      body: "请上传故障部位照片以便受理",
      time: "昨天",
      unread: true,
    },
    {
      title: "新产品资料已发布",
      body: "GT1 Pro 技术手册 v1.2 已上线资料中心",
      time: "3 天前",
      unread: false,
    },
  ],

  team: [
    { name: "Marcus Feld", email: "marcus@alsvid-ca.com", role: "Owner", status: "Active" },
    { name: "Elena Ruiz", email: "elena@alsvid-ca.com", role: "Purchasing Manager", status: "Active" },
    { name: "Tom Ito", email: "tom@alsvid-ca.com", role: "Service Lead", status: "Active" },
    { name: "Sara Lindqvist", email: "sara@alsvid-ca.com", role: "Sales", status: "Invited" },
  ],
};
