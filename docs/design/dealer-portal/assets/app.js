/* ============================================================
   ALSVID Dealer Portal — App Shell Interaction
   ------------------------------------------------------------
   1. Demo Data 开关（默认关闭 → 呈现待接入状态，不伪造业务数据）
   2. Header / Drawer / Popover 交互
   3. 表格渲染适配层（连接真实 API 时替换 renderers 即可）
   ============================================================ */

(function () {
  "use strict";

  /* ---------------- Icons ---------------- */
  const S = 'stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"';
  const ICONS = {
    search: `<circle cx="11" cy="11" r="7" ${S}/><path d="M16.5 16.5L21 21" ${S}/>`,
    bell: `<path d="M18 8a6 6 0 1 0-12 0c0 6-2 7-2 7h16s-2-1-2-7Z" ${S}/><path d="M13.7 20a2 2 0 0 1-3.4 0" ${S}/>`,
    user: `<circle cx="12" cy="8" r="3.6" ${S}/><path d="M4.5 20a7.5 7.5 0 0 1 15 0" ${S}/>`,
    chevronDown: `<path d="M6 9l6 6 6-6" ${S}/>`,
    chevronRight: `<path d="M9 6l6 6-6 6" ${S}/>`,
    arrowRight: `<path d="M5 12h14M13 6l6 6-6 6" ${S}/>`,
    arrowLeft: `<path d="M19 12H5M11 18l-6-6 6-6" ${S}/>`,
    menu: `<path d="M4 7h16M4 12h16M4 17h16" ${S}/>`,
    close: `<path d="M6 6l12 12M18 6L6 18" ${S}/>`,
    box: `<path d="M20 8.5v7L12 20l-8-4.5v-7L12 4l8 4.5Z" ${S}/><path d="M4 8.5 12 13l8-4.5M12 13v7" ${S}/>`,
    layers: `<path d="M12 3 3 8l9 5 9-5-9-5Z" ${S}/><path d="M3 13l9 5 9-5" ${S}/>`,
    truck: `<path d="M3 6h10v9H3z" ${S}/><path d="M13 9h4l3 3v3h-7z" ${S}/><circle cx="7" cy="18" r="1.8" ${S}/><circle cx="17" cy="18" r="1.8" ${S}/>`,
    fileText: `<path d="M14 3v5h5" ${S}/><path d="M19 8v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7l5 5Z" ${S}/><path d="M9 13h6M9 17h4" ${S}/>`,
    download: `<path d="M12 4v11" ${S}/><path d="M8 11l4 4 4-4" ${S}/><path d="M5 19h14" ${S}/>`,
    plus: `<path d="M12 5v14M5 12h14" ${S}/>`,
    check: `<circle cx="12" cy="12" r="8.5" ${S}/><path d="M8.5 12.2l2.4 2.4 4.6-5" ${S}/>`,
    alert: `<circle cx="12" cy="12" r="8.5" ${S}/><path d="M12 8v4.5M12 16h.01" ${S}/>`,
    info: `<circle cx="12" cy="12" r="8.5" ${S}/><path d="M12 11v5M12 8h.01" ${S}/>`,
    lock: `<rect x="5" y="10.5" width="14" height="9.5" rx="2" ${S}/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" ${S}/>`,
    wrench: `<path d="M14.5 6.5a3.5 3.5 0 0 0 4.6 4.6l-8.4 8.4a2.6 2.6 0 0 1-3.7-3.7l8.4-8.4Z" ${S}/><path d="M14.5 6.5 18 3" ${S}/>`,
    folder: `<path d="M3 7a2 2 0 0 1 2-2h4l2 2.5h8a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" ${S}/>`,
    calendar: `<rect x="3.5" y="5.5" width="17" height="14" rx="2" ${S}/><path d="M3.5 10h17M8 3.5V7M16 3.5V7" ${S}/>`,
    clock: `<circle cx="12" cy="12" r="8.5" ${S}/><path d="M12 7.5V12l3 2" ${S}/>`,
    mail: `<rect x="3" y="5.5" width="18" height="13" rx="2" ${S}/><path d="M3.5 7l8.5 6 8.5-6" ${S}/>`,
    phone: `<path d="M8 3.5h3l1.5 4-2 1.5a10 10 0 0 0 4.5 4.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A15.5 15.5 0 0 1 4 5.7 2 2 0 0 1 6 3.5Z" ${S}/>`,
    pin: `<path d="M12 21s6.5-5.6 6.5-10.3A6.5 6.5 0 0 0 5.5 10.7C5.5 15.4 12 21 12 21Z" ${S}/><circle cx="12" cy="10.5" r="2.3" ${S}/>`,
    more: `<circle cx="5.5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="18.5" cy="12" r="1.2" fill="currentColor" stroke="none"/>`,
    external: `<path d="M14 4h6v6" ${S}/><path d="M20 4l-8.5 8.5" ${S}/><path d="M18 14.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h3.5" ${S}/>`,
    database: `<ellipse cx="12" cy="6" rx="7.5" ry="3" ${S}/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" ${S}/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" ${S}/>`,
    inbox: `<path d="M3.5 13h5l1.5 2.5h4L15.5 13H20" ${S}/><path d="M5 5.5h14l2.5 7.5v4a2 2 0 0 1-2 2H4.5a2 2 0 0 1-2-2v-4L5 5.5Z" ${S}/>`,
    image: `<rect x="3.5" y="4.5" width="17" height="15" rx="2" ${S}/><circle cx="9" cy="10" r="1.6" ${S}/><path d="M4 17l5-4.5 3.5 3 3-2.5L20 17" ${S}/>`,
    upload: `<path d="M12 16V5" ${S}/><path d="M8 9l4-4 4 4" ${S}/><path d="M5 19h14" ${S}/>`,
    sliders: `<path d="M4 7h10M18 7h2M4 17h2M10 17h10" ${S}/><circle cx="16" cy="7" r="2" ${S}/><circle cx="8" cy="17" r="2" ${S}/>`,
    shield: `<path d="M12 3.5 5 6v6c0 4 3 6.8 7 8.5 4-1.7 7-4.5 7-8.5V6l-7-2.5Z" ${S}/>`,
    building: `<rect x="5" y="3.5" width="14" height="17" rx="1.5" ${S}/><path d="M9 8h2M13 8h2M9 12h2M13 12h2M9.5 20.5V16h5v4.5" ${S}/>`,
    users: `<circle cx="9" cy="8" r="3.2" ${S}/><path d="M3 19a6 6 0 0 1 12 0" ${S}/><path d="M16 5.5a3 3 0 0 1 0 6M17.5 19a5.5 5.5 0 0 0-2-4.2" ${S}/>`,
    grid: `<rect x="4" y="4" width="7" height="7" rx="1.5" ${S}/><rect x="13" y="4" width="7" height="7" rx="1.5" ${S}/><rect x="4" y="13" width="7" height="7" rx="1.5" ${S}/><rect x="13" y="13" width="7" height="7" rx="1.5" ${S}/>`,
    cart: `<path d="M4 5h2l2.2 9.5a1.6 1.6 0 0 0 1.6 1.3h7.4a1.6 1.6 0 0 0 1.6-1.2L20.5 8H7" ${S}/><circle cx="10" cy="19.5" r="1.4" ${S}/><circle cx="17.5" cy="19.5" r="1.4" ${S}/>`,
    logout: `<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" ${S}/><path d="M10 8l-4 4 4 4M6 12h9" ${S}/>`,
    plug: `<path d="M9 3v5M15 3v5" ${S}/><path d="M7 8h10v3a5 5 0 0 1-10 0V8Z" ${S}/><path d="M12 16v5" ${S}/>`,
    warehouse: `<path d="M3.5 20V9.5L12 5l8.5 4.5V20" ${S}/><path d="M8 20v-6h8v6" ${S}/>`,
  };

  function icon(name, size) {
    const p = ICONS[name] || "";
    const s = size || 18;
    return `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true">${p}</svg>`;
  }

  /* 自行车线稿占位图 */
  function bikeSVG() {
    return `<svg viewBox="0 0 260 150" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="56" cy="104" r="32"/>
      <circle cx="204" cy="104" r="32"/>
      <circle cx="56" cy="104" r="4"/>
      <circle cx="204" cy="104" r="4"/>
      <path d="M56 104h64M56 104l40-52M120 104l-24-52M120 104l52-36M106 52l58-4M172 68l32 36M178 48l4-8M172 48h12"/>
      <path d="M120 104a10 10 0 1 0 .01 0"/>
      <path d="M120 104l8 12"/>
      <path d="M96 34h26"/>
    </svg>`;
  }

  /* ---------------- Utils ---------------- */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }

  const STATUS_CLASS = {
    Draft: "badge-neutral",
    Submitted: "badge-outline",
    "Pending Approval": "badge-amber",
    Confirmed: "badge-ink",
    Production: "badge-outline",
    Shipping: "badge-amber",
    Delivered: "badge-accent",
    Completed: "badge-accent",
    Allocated: "badge-outline",
    Received: "badge-ink",
    Reviewing: "badge-amber",
    Approved: "badge-ink",
    Repairing: "badge-outline",
    Available: "badge-accent",
    Limited: "badge-amber",
    "Pre-order": "badge-outline",
    Active: "badge-accent",
    Invited: "badge-amber",
  };

  const badge = (s) => `<span class="badge ${STATUS_CLASS[s] || "badge-neutral"}">${esc(s)}</span>`;

  /* 价格策略尚未确认 —— 按 docs/FOUR_PORTALS 的要求不得编造，统一占位 */
  const money = (v) =>
    v === "待决策"
      ? '<span class="t-xs t-muted">待决策 · 未定价</span>'
      : esc(v);

  /* ---------------- Demo Data state ---------------- */
  const KEY = "alsvid:demo-data";
  /* 首次访问默认开启 Demo Data：让所有页面一上手就有完整形态。
     接入真实 API 后把这个默认改成 false（或直接删除 demo-data.js）。*/
  const state = {
    demo: localStorage.getItem(KEY) !== "0",
  };

  function setDemo(on) {
    state.demo = !!on;
    localStorage.setItem(KEY, state.demo ? "1" : "0");
    applyDemo();
  }

  /* ---------------- Renderers ---------------- */
  const R = {
    activity(tbody, D) {
      const TYPE = { unread: { label: "待确认", cls: "badge-amber" }, read: { label: "进行中", cls: "badge-outline" } };
      return D.notifications.map((n) => {
        const t = n.unread ? TYPE.unread : TYPE.read;
        return `<tr>
          <td style="width:28px"><i class="dot ${n.unread ? "dot-accent" : "dot-neutral"}"></i></td>
          <td><span class="row-item-title">${esc(n.title)}</span><span class="t-xs t-muted" style="display:block;margin-top:2px">${esc(n.body)}</span></td>
          <td><span class="badge ${t.cls}">${t.label}</span></td>
          <td class="t-muted">${esc(n.time)}</td>
          <td class="col-right"><button class="btn btn-secondary btn-sm">处理</button></td>
        </tr>`;
      }).join("");
    },
    purchaseRequests(tbody, D) {
      return D.purchaseRequests.map((r) => `<tr data-status="${esc(r.status)}">
        <td><span class="t-mono" style="font-size:12.5px">${esc(r.id)}</span></td>
        <td>${esc(r.items)}</td>
        <td class="num">${esc(r.qty)}</td>
        <td class="num">${money(r.amount)}</td>
        <td>${badge(r.status)}</td>
        <td class="t-muted">${esc(r.date)}</td>
        <td class="col-right"><button class="btn btn-ghost btn-sm">查看 ${icon("chevronRight", 14)}</button></td>
      </tr>`).join("");
    },
    orders(tbody, D) {
      return D.orders.map((o) => `<tr data-status="${esc(o.status)}">
        <td><span class="t-mono" style="font-size:12.5px">${esc(o.id)}</span></td>
        <td>${esc(o.product)}</td>
        <td class="t-sm t-muted">${esc(o.type)}</td>
        <td class="num">${esc(o.qty)}</td>
        <td class="num">${money(o.amount)}</td>
        <td>${badge(o.status)}</td>
        <td class="t-muted">${esc(o.eta)}</td>
        <td class="col-right"><button class="btn btn-secondary btn-sm">详情</button></td>
      </tr>`).join("");
    },
    vehicles(tbody, D) {
      return D.vehicles.map((v) => `<tr data-status="${esc(v.status)}">
        <td><span class="t-mono" style="font-size:12.5px">${esc(v.vin)}</span></td>
        <td>${esc(v.model)}</td>
        <td><span class="row" style="gap:8px"><i class="swatch" style="background:${v.color === "White" ? "#f2f2f2" : v.color === "Black" ? "#0f0f0f" : v.color === "Green" ? "#0d6b3f" : "#6b7075"}"></i>${esc(v.color)}</span></td>
        <td>${badge(v.status)}</td>
        <td class="t-muted">${esc(v.date)}</td>
        <td class="col-right"><button class="btn btn-ghost btn-sm">详情 ${icon("chevronRight", 14)}</button></td>
      </tr>`).join("");
    },
    afterSales(tbody, D) {
      return D.afterSales.map((a) => `<tr data-status="${esc(a.status)}">
        <td><span class="t-mono" style="font-size:12.5px">${esc(a.id)}</span></td>
        <td>${esc(a.model)}<div class="t-xs t-mono" style="margin-top:2px">${esc(a.vin.slice(-8))}</div></td>
        <td class="t-sm">${esc(a.issue)}</td>
        <td>${badge(a.status)}</td>
        <td class="t-muted">${esc(a.date)}</td>
        <td class="col-right"><button class="btn btn-ghost btn-sm">查看 ${icon("chevronRight", 14)}</button></td>
      </tr>`).join("");
    },
    availability(tbody, D) {
      return D.availability.map((a) => `<tr data-status="${esc(a.status)}" data-series="${esc(a.series)}">
        <td class="t-strong">${esc(a.model)}</td>
        <td class="t-sm t-muted">${esc(a.series)}</td>
        <td>${badge(a.status)}</td>
        <td class="t-muted">${esc(a.lead)}</td>
        <td>${esc(a.next)}</td>
        <td class="col-right"><button class="btn btn-secondary btn-sm">Request Purchase</button></td>
      </tr>`).join("");
    },
    team(tbody, D) {
      return D.team.map((m) => `<tr>
        <td><span class="row" style="gap:10px"><i class="avatar" style="width:32px;height:32px">${esc(m.name.split(" ").map((x) => x[0]).join(""))}</i><span><span class="row-item-title">${esc(m.name)}</span><span class="t-xs t-muted" style="display:block;margin-top:1px">${esc(m.email)}</span></span></span></td>
        <td>${esc(m.role)}</td>
        <td>${badge(m.status)}</td>
        <td class="col-right"><button class="btn btn-ghost btn-sm">${icon("more", 16)}</button></td>
      </tr>`).join("");
    },
    notifications(list, D) {
      return D.notifications.map((n) => `<li>
        <a href="#" class="pop-item" style="align-items:flex-start">
          <i class="dot ${n.unread ? "dot-accent" : "dot-neutral"}" style="margin-top:8px"></i>
          <span style="min-width:0;flex:1">
            <span class="row-item-title" style="display:block">${esc(n.title)}</span>
            <span class="t-xs t-muted" style="display:block;margin-top:2px;white-space:normal">${esc(n.body)}</span>
            <span class="t-xs" style="display:block;margin-top:4px;color:var(--c-ink-35)">${esc(n.time)}</span>
          </span>
        </a>
      </li>`).join("");
    },
  };

  const COLSPAN_FALLBACK = 6;

  function applyDemo() {
    const D = window.ALSVID_DEMO;
    const on = state.demo;

    document.body.classList.toggle("demo-on", on);

    /* Demo bar */
    $$("[data-demo-bar]").forEach((bar) => {
      bar.hidden = false;
      bar.innerHTML = on
        ? `<div class="shell demo-bar-inner">
             ${icon("info", 14)}
             <span>当前展示的是 <strong>Demo Data</strong>，仅用于 UI 演示，非真实业务数据。</span>
             <span class="spacer"></span>
             <span class="mono hide-sm">alsvid:demo-data = true</span>
             <button class="btn btn-sm btn-secondary" data-demo-toggle>关闭 Demo</button>
           </div>`
        : `<div class="shell demo-bar-inner">
             ${icon("plug", 14)}
             <span>业务数据源尚未接入 ALSVID API，相关模块显示占位状态。</span>
             <span class="spacer"></span>
             <span class="mono hide-sm">GET /api/dealer/*</span>
             <button class="btn btn-sm btn-accent" data-demo-toggle>启用 Demo Data</button>
           </div>`;
    });

    /* 文本绑定 */
    $$("[data-bind]").forEach((el) => {
      const path = el.getAttribute("data-bind");
      if (on && D) {
        const v = path.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), D);
        if (v !== undefined) el.textContent = v;
      } else {
        el.textContent = el.getAttribute("data-bind-empty") || "—";
      }
    });

    /* 表格 / 列表 */
    $$("[data-list]").forEach((el) => {
      const key = el.getAttribute("data-list");
      const fn = R[key];
      if (!fn) return;
      if (on && D) {
        el.innerHTML = fn(el, D);
        el.closest(".tbl-wrap, .card")?.classList.remove("is-pending");
        /* 状态列同时作为 chip 筛选键 */
        el.querySelectorAll("[data-status]").forEach((tr) =>
          tr.setAttribute("data-filter-key", tr.getAttribute("data-status"))
        );
      } else {
        const cols = el.closest("table")
          ? el.closest("table").querySelectorAll("thead th").length || COLSPAN_FALLBACK
          : COLSPAN_FALLBACK;
        const msg = el.getAttribute("data-empty") || "暂无数据";
        const api = el.getAttribute("data-api") || "GET /api/dealer/" + key;
        if (el.tagName === "TBODY") {
          el.innerHTML = `<tr><td colspan="${cols}"><div class="empty" style="padding:56px 24px">
            <i class="empty-icon">${icon("database", 22)}</i>
            <span class="empty-title">${esc(msg)}</span>
            <span class="empty-desc">数据源接入后将自动显示当前经销商权限范围内的记录。</span>
            <span class="api-note">${esc(api)}</span>
          </div></td></tr>`;
        } else {
          el.innerHTML = `<li><div class="empty" style="padding:40px 24px">
            <span class="empty-desc">${esc(msg)}</span>
            <span class="api-note">${esc(api)}</span>
          </div></li>`;
        }
      }
    });

    /* 条件区块 */
    $$("[data-when]").forEach((el) => el.hidden = el.getAttribute("data-when") === "demo" ? !on : on);

    /* Demo 开关文案 */
    $$("[data-demo-label]").forEach((el) => (el.textContent = on ? "关闭 Demo Data" : "启用 Demo Data"));

    fillVehicleSelects();
    applyActiveFilter();
    updateNavCounts();
  }

  function updateNavCounts() {
    const D = window.ALSVID_DEMO;
    $$("[data-nav-count]").forEach((el) => {
      if (state.demo && D) {
        const src = el.getAttribute("data-nav-count");
        const n = src.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), D);
        el.textContent = n !== undefined ? n : "";
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    });
  }

  /* 列表被 applyDemo 重渲染后，重新套用当前选中的筛选 chip */
  function applyActiveFilter() {
    const chip = document.querySelector('[data-filter][aria-selected="true"]');
    if (!chip) return;
    const group = chip.closest("[data-filter-group]");
    if (!group) return;
    const target = document.querySelector(group.getAttribute("data-filter-group"));
    if (!target) return;
    const val = chip.getAttribute("data-filter");
    if (val === "all") return;
    target.querySelectorAll("[data-filter-key]").forEach((row) => {
      row.hidden = row.getAttribute("data-filter-key") !== val;
    });
  }

  /* 表单里的车辆下拉：跟随 demo 开关填入车辆的 VIN */
  function fillVehicleSelects() {
    $$("[data-fill-vehicles]").forEach((sel) => {
      sel.innerHTML = "";
      if (state.demo && window.ALSVID_DEMO) {
        window.ALSVID_DEMO.vehicles.forEach((v) => {
          const o = document.createElement("option");
          o.textContent = v.model + " · " + v.vin.slice(-8) + " · " + v.color;
          o.value = v.vin;
          sel.appendChild(o);
        });
      } else {
        const o = document.createElement("option");
        o.textContent = "待接入车辆数据源";
        sel.appendChild(o);
      }
    });
  }

  /* ---------------- Shell components ---------------- */
  const NAV = [
    { id: "dashboard", label: "工作台", href: "index.html" },
    { id: "catalog", label: "产品目录", href: "catalog.html" },
    { id: "purchase", label: "采购", href: "purchase.html", count: "stats.pendingOrders.value" },
    { id: "orders", label: "订单", href: "orders.html" },
    { id: "vehicles", label: "车辆", href: "vehicles.html" },
    { id: "inventory", label: "库存", href: "inventory.html" },
    { id: "after-sales", label: "售后", href: "after-sales.html", count: "stats.afterSales.value" },
  ];
  const MORE = [
    { id: "parts", label: "配件目录", href: "parts.html", icon: "box" },
    { id: "documents", label: "资料中心", href: "documents.html", icon: "folder" },
    { id: "account", label: "账户中心", href: "account.html", icon: "building" },
  ];

  function buildShell(file) {
    const navHTML = NAV.map(
      (n) => `<a class="nav-link" data-nav="${n.id}" href="${n.href}">${n.label}${
        n.count ? `<span class="nav-count" data-nav-count="${n.count}"></span>` : ""
      }</a>`
    ).join("");

    const moreHTML = MORE.map(
      (m) => `<a class="pop-item" data-nav="${m.id}" href="${m.href}">${icon(m.icon, 16)}${m.label}</a>`
    ).join("");

    const drawerNav = NAV.concat(MORE)
      .map((n) => `<a class="drawer-link" data-nav="${n.id}" href="${n.href}">${
        n.icon ? icon(n.icon, 18) : icon("grid", 18)
      }${n.label}</a>`)
      .join("");

    const header = `<header class="header" id="siteHeader">
      <div class="header-inner shell shell-wide">
        <a class="logo" href="index.html" aria-label="ALSVID Dealer Portal">
          <span class="logo-mark">ALSVID</span>
          <span class="logo-sub">Dealer</span>
        </a>
        <nav class="nav" aria-label="主导航">${navHTML}</nav>
        <div class="hdr-right">
          <label class="searchbox hdr-search hide-md" style="width:190px">
            <input class="input" type="search" placeholder="搜索车型 / SKU / 订单" aria-label="搜索" data-global-search>
          </label>
          <button class="btn-icon search-btn" aria-label="搜索">${icon("search", 18)}</button>
          <div class="pop">
            <button class="btn-icon" data-pop-toggle aria-label="消息">
              ${icon("bell", 18)}<i class="notification-dot"></i>
            </button>
            <div class="pop-panel" style="min-width:320px">
              <div class="pop-head">
                <span class="t-eyebrow">消息通知</span>
              </div>
              <ul data-list="notifications" data-empty="暂无通知" data-api="GET /api/dealer/notifications"></ul>
              <div class="pop-sep"></div>
              <a href="#" class="pop-item">${icon("arrowRight", 16)}查看全部消息</a>
            </div>
          </div>
          <div class="pop">
            <button class="btn-icon" data-pop-toggle aria-label="账户" style="width:auto;padding:0 8px;height:36px;border-radius:8px;gap:0">
              <span class="row" style="gap:9px">
                <i class="avatar" data-bind="dealer.initials" data-bind-empty="DL">DL</i>
                <span class="hdr-account-text" style="text-align:left;line-height:1.25">
                  <span class="t-xs" style="display:block;font-weight:500;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
                        data-bind="dealer.name" data-bind-empty="ALSVID Dealer">ALSVID Dealer</span>
                  <span class="t-xs" style="display:block;color:var(--c-ink-50)"
                        data-bind="dealer.region" data-bind-empty="Region —">Region —</span>
                </span>
                ${icon("chevronDown", 14)}
              </span>
            </button>
            <div class="pop-panel">
              <div class="pop-head">
                <div class="row" style="gap:10px">
                  <i class="avatar" style="width:36px;height:36px" data-bind="dealer.initials" data-bind-empty="DL">DL</i>
                  <span style="min-width:0">
                    <span class="row-item-title" style="display:block" data-bind="dealer.name" data-bind-empty="未连接账户">—</span>
                    <span class="t-xs t-muted" style="display:block" data-bind="dealer.code" data-bind-empty="session pending">—</span>
                  </span>
                </div>
                <div class="row" style="gap:6px;margin-top:10px">
                  <span class="badge badge-accent" data-when="demo"><i class="dot dot-accent"></i>Active Dealer</span>
                  <span class="api-note">JWT claims</span>
                </div>
              </div>
              <a class="pop-item" data-nav="account" href="account.html">${icon("building", 16)}账户中心</a>
              <a class="pop-item" data-nav="documents" href="documents.html">${icon("folder", 16)}资料中心</a>
              <div class="pop-sep"></div>
              <button class="pop-item" data-demo-toggle style="width:100%">
                ${icon("database", 16)}<span data-demo-label>Demo Data</span>
              </button>
              <button class="pop-item" style="width:100%">${icon("logout", 16)}退出登录</button>
            </div>
          </div>
          <div class="pop hide-md">
            <button class="btn-icon" data-pop-toggle aria-label="更多"${MORE.some((m) => m.id === file) ? ' aria-current="page"' : ""}>${icon("more", 18)}</button>
            <div class="pop-panel" style="min-width:200px">${moreHTML}</div>
          </div>
          <button class="menu-btn" id="menuBtn" aria-label="打开菜单">${icon("menu", 20)}</button>
        </div>
      </div>
    </header>
    <div class="demo-bar" data-demo-bar hidden></div>`;

    const drawer = `<div class="drawer-head">
        <a class="logo" href="index.html"><span class="logo-mark">ALSVID</span><span class="logo-sub">Dealer</span></a>
        <button class="btn-icon" id="drawerClose" aria-label="关闭">${icon("close", 18)}</button>
      </div>
      <div class="drawer-body">
        <label class="searchbox" style="margin-bottom:16px">
          <input class="input" type="search" placeholder="搜索车型 / SKU / 订单" aria-label="搜索" data-global-search>
        </label>
        <nav style="display:flex;flex-direction:column;gap:2px" aria-label="移动导航">${drawerNav}</nav>
      </div>
      <div class="drawer-foot">
        <div class="row" style="gap:10px;margin-bottom:12px">
          <i class="avatar" data-bind="dealer.initials" data-bind-empty="DL">DL</i>
          <span style="min-width:0">
            <span class="row-item-title" style="display:block" data-bind="dealer.name" data-bind-empty="未连接账户">—</span>
            <span class="t-xs t-muted" data-bind="dealer.region" data-bind-empty="—">—</span>
          </span>
        </div>
        <button class="btn btn-secondary btn-block" data-demo-toggle><span data-demo-label>Demo Data</span></button>
      </div>`;

    const footer = `<div class="shell shell-wide footer-inner">
        <span>© 2026 ALSVID · Dealer Portal</span>
        <span class="footer-links">
          <a href="documents.html">${icon("folder", 13)} 资料中心</a>
          <a href="#" >${icon("shield", 13)} 服务条款</a>
          <a href="#">${icon("lock", 13)} 隐私政策</a>
          <a href="#">${icon("wrench", 13)} 支持</a>
        </span>
        <span class="api-note">v1.0 · 待接入 ALSVID API</span>
      </div>`;

    const headerSlot = document.querySelector("[data-shell-header]");
    const drawerSlot = document.querySelector("[data-shell-drawer]");
    const footerSlot = document.querySelector("[data-shell-footer]");

    if (headerSlot) {
      headerSlot.outerHTML = header;
      const slot2 = document.querySelector("[data-shell-drawer]");
      if (slot2) slot2.outerHTML = `<aside class="drawer" id="drawer">${drawer}</aside>`;
    } else if (drawerSlot) {
      drawerSlot.outerHTML = `<aside class="drawer" id="drawer">${drawer}</aside>`;
    }
    if (footerSlot) {
      footerSlot.outerHTML = `<footer class="footer">${footer}</footer>`;
    }
  }

  /* ---------------- Shell init ---------------- */
  function initShell(file) {
    buildShell(file);
    $$("[data-nav]").forEach((a) => {
      if (a.getAttribute("data-nav") === file) a.setAttribute("aria-current", "page");
    });

    /* 图标注入 */
    $$("[data-icon]").forEach((el) => {
      if (el.dataset.iconDone) return;
      el.dataset.iconDone = "1";
      const n = el.getAttribute("data-icon");
      const size = el.getAttribute("data-icon-size");
      if (n === "menu") {
        el.innerHTML = icon("menu", size || 20);
        return;
      }
      const labelNode = Array.from(el.childNodes).find(
        (c) => c.nodeType === 3 && c.textContent.trim()
      );
      el.innerHTML = icon(n, size || 18) + (labelNode ? `<span>${labelNode.textContent.trim()}</span>` : "");
    });

    /* 占位车图 */
    $$("[data-bike]").forEach((el) => {
      if (el.dataset.bikeDone) return;
      el.dataset.bikeDone = "1";
      el.innerHTML = bikeSVG();
    });

    /* Search 图标 */
    $$(".searchbox").forEach((el) => {
      if (el.dataset.sDone) return;
      el.dataset.sDone = "1";
      el.insertAdjacentHTML("afterbegin", icon("search", 16));
    });

    /* Popovers */
    $$(".pop").forEach((pop) => {
      const btn = pop.querySelector("[data-pop-toggle]");
      if (!btn || btn.dataset.popDone) return;
      btn.dataset.popDone = "1";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const wasOpen = pop.classList.contains("is-open");
        $$(".pop").forEach((p) => p.classList.remove("is-open"));
        if (!wasOpen) pop.classList.add("is-open");
      });
    });
    document.addEventListener("click", () => $$(".pop").forEach((p) => p.classList.remove("is-open")));
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") $$(".pop").forEach((p) => p.classList.remove("is-open"));
    });

    /* Drawer */
    const drawer = $("#drawer");
    const scrim = $("#drawerScrim");
    const openBtn = $("#menuBtn");
    const closeBtn = $("#drawerClose");
    function toggleDrawer(open) {
      if (!drawer) return;
      drawer.classList.toggle("is-open", open);
      scrim?.classList.toggle("is-open", open);
      document.body.style.overflow = open ? "hidden" : "";
    }
    openBtn?.addEventListener("click", () => toggleDrawer(true));
    closeBtn?.addEventListener("click", () => toggleDrawer(false));
    scrim?.addEventListener("click", () => toggleDrawer(false));

    /* 窄屏搜索按钮 → 呼出抽屉并聚焦搜索 */
    $$(".search-btn").forEach((btn) =>
      btn.addEventListener("click", () => {
        toggleDrawer(true);
        setTimeout(() => drawer?.querySelector("input[type=search]")?.focus(), 260);
      })
    );

    /* Demo toggle（事件委托，bar 会重建） */
    document.addEventListener("click", (e) => {
      const t = e.target.closest("[data-demo-toggle]");
      if (t) {
        e.preventDefault();
        setDemo(!state.demo);
      }
    });

    /* 芯片 / 分类筛选（多个筛选组指向同一目标时选中态联动） */
    document.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-filter]");
      if (!chip) return;
      const group = chip.closest("[data-filter-group]");
      if (!group) return;
      const sel = group.getAttribute("data-filter-group");
      const val = chip.getAttribute("data-filter");
      $$(`[data-filter-group="${sel}"]`).forEach((g) =>
        $$("[data-filter]", g).forEach((c) =>
          c.setAttribute("aria-selected", String(c.getAttribute("data-filter") === val))
        )
      );
      const target = document.querySelector(sel);
      if (!target) return;
      $$("[data-filter-key]", target).forEach((row) => {
        row.hidden = !(val === "all" || row.getAttribute("data-filter-key") === val);
      });
    });

    /* 页面内搜索：过滤卡片 / 列表行，并隐藏被清空的全部分组 */
    $$("[data-search]").forEach((input) => {
      if (input.dataset.searchDone) return;
      input.dataset.searchDone = "1";
      const target = document.querySelector(input.getAttribute("data-search"));
      if (!target) return;
      const items = target.querySelectorAll(".pcard, .row-item");
      items.forEach((el) => el.setAttribute("data-searchable", ""));
      const apply = () => {
        const q = input.value.trim().toLowerCase();
        target.querySelectorAll("[data-searchable]").forEach((el) => {
          el.hidden = q.length > 0 && !el.textContent.toLowerCase().includes(q);
        });
        target.querySelectorAll("[data-search-group]").forEach((g) => {
          /* 分组标题命中的话，整组保留（例如搜 "warranty" 应看到 Warranty Documents） */
          const gText = (g.querySelector("h2, h3, .cat-group-title")?.textContent || "").toLowerCase();
          const hit = q.length > 0 && gText.includes(q);
          if (hit) g.querySelectorAll("[data-searchable]").forEach((el) => (el.hidden = false));
          const rows = g.querySelectorAll("[data-searchable]");
          g.hidden = rows.length > 0 && Array.from(rows).every((r) => r.hidden);
        });
        const all = target.querySelectorAll("[data-searchable]");
        const empty = target.querySelector("[data-search-empty]");
        if (empty) empty.hidden = !(q.length > 0 && Array.from(all).every((e) => e.hidden));
      };
      input.addEventListener("input", apply);
      /* 支持从 URL 带入关键词（例如从顶部 header 搜索跳转过来） */
      const q = new URLSearchParams(location.search).get("q");
      if (q) { input.value = q; apply(); }
    });

    /* 顶部搜索：回车跳转到产品目录并带上关键词 */
    $$("[data-global-search]").forEach((input) => {
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const q = input.value.trim();
        location.href = "catalog.html" + (q ? "?q=" + encodeURIComponent(q) : "");
      });
    });

    /* URL 参数预设状态筛选（Dashboard 概览卡直达）：
       只设置选中态，实际过滤由 applyActiveFilter 在列表渲染后执行，
       否则会被 applyDemo 的 innerHTML 重渲染冲掉。*/
    const st = new URLSearchParams(location.search).get("status");
    if (st) {
      const wanted = document.querySelector('[data-filter="' + st.replace(/["\\]/g, "") + '"]');
      if (wanted) {
        wanted.closest("[data-filter-group]")
          .querySelectorAll("[data-filter]")
          .forEach((c) => c.setAttribute("aria-selected", "false"));
        wanted.setAttribute("aria-selected", "true");
      }
    }

    fillVehicleSelects();

    /* Segmented tabs */
    $$("[data-seg]").forEach((seg) => {
      seg.addEventListener("click", (e) => {
        const btn = e.target.closest("button[data-tab]");
        if (!btn) return;
        $$("button[data-tab]", seg).forEach((b) => b.setAttribute("aria-selected", "false"));
        btn.setAttribute("aria-selected", "true");
        const id = seg.getAttribute("data-seg");
        $$(`[data-tabpanel="${id}"]`).forEach((p) => {
          p.hidden = p.getAttribute("data-tabvalue") !== btn.getAttribute("data-tab");
        });
      });
    });
  }

  /* 暴露给页面调用 */
  window.ALSVID = { initShell, icon, setDemo, get demo() { return state.demo; } };

  document.addEventListener("DOMContentLoaded", () => {
    applyDemo();
  });
})();
