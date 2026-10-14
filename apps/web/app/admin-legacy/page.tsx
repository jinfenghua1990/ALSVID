import Link from "next/link";
import { AppShell } from "@alsvid/ui";
import { requireInternalPreviewSession } from "../_lib/portal-access";
import { navigationFor } from "../app-navigation";
import { WorkbenchIcon, type WorkbenchIconName } from "../admin/workbench-icon";
import { WorkbenchPanels } from "../admin/workbench-panels";
import styles from "../admin/workbench.module.css";
const quickLinks = [
  {
    label: "产品",
    desc: "产品管理",
    href: "/product",
    icon: "box",
    tone: "blue",
  },
  {
    label: "订单",
    desc: "订单处理",
    href: "/commerce",
    icon: "order",
    tone: "blue",
  },
  {
    label: "生产",
    desc: "生产计划",
    href: "/production",
    icon: "gear",
    tone: "cyan",
  },
  {
    label: "库存",
    desc: "库存管理",
    href: "/inventory",
    icon: "warehouse",
    tone: "indigo",
  },
  {
    label: "经销商",
    desc: "渠道管理",
    href: "/dealers",
    icon: "people",
    tone: "blue",
  },
  {
    label: "客户",
    desc: "客户管理",
    href: "/customers",
    icon: "user",
    tone: "blue",
  },
  {
    label: "售后",
    desc: "售后服务",
    href: "/after-sales",
    icon: "headset",
    tone: "blue",
  },
  {
    label: "供应链",
    desc: "供应链管理",
    href: "/supply",
    icon: "link",
    tone: "indigo",
  },
  {
    label: "数据",
    desc: "数据分析",
    href: "/overview",
    icon: "chart",
    tone: "cyan",
  },
  {
    label: "设置",
    desc: "系统设置",
    href: "/settings/environment",
    icon: "settings",
    tone: "blue",
  },
] as const;
const attention = [
  {
    title: "待我审批",
    desc: "采购申请 · 经销商准入 · 价格政策",
    href: "/supply",
    icon: "clipboard",
    tone: "blue",
  },
  {
    title: "生产异常",
    desc: "质检异常 · 物料短缺 · 进度延迟",
    href: "/production",
    icon: "warning",
    tone: "red",
  },
  {
    title: "库存预警",
    desc: "低于安全库存 · 库存差异",
    href: "/inventory",
    icon: "box",
    tone: "orange",
  },
  {
    title: "售后工单",
    desc: "保修申请 · 服务跟进 · 客户催单",
    href: "/after-sales",
    icon: "headset",
    tone: "green",
  },
] as const;
const metrics = [
  {
    title: "在产车型",
    source: "生产数据尚未接入",
    href: "/production",
    icon: "bike",
    tone: "blue",
  },
  {
    title: "待履约订单",
    source: "订单数据尚未接入",
    href: "/commerce",
    icon: "order",
    tone: "purple",
  },
  {
    title: "保修工单",
    source: "保修数据尚未接入",
    href: "/after-sales",
    icon: "shield",
    tone: "cyan",
  },
  {
    title: "低库存物料",
    source: "库存预警尚未接入",
    href: "/inventory",
    icon: "box",
    tone: "orange",
  },
] as const;
function IconTile({ icon, tone }: { icon: WorkbenchIconName; tone: string }) {
  return (
    <span className={`${styles.iconTile} ${styles[tone]}`}>
      <WorkbenchIcon name={icon} />
    </span>
  );
}
export default async function AdminPortalPage() {
  await requireInternalPreviewSession();
  return (
    <AppShell
      navigation={navigationFor("/admin")}
      footer="ALSVID · Operations Center"
      classNames={{
        shell: styles.shell ?? "",
        workspace: styles.workspace ?? "",
      }}
    >
      <section className={styles.hero} aria-label="ALSVID 运营工作台">
        <div className={styles.heroShade} />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>ALSVID OPERATIONS</p>
          <h1>工作台</h1>
          <p className={styles.heroLead}>今天需要你处理的事，一目了然</p>
          <p className={styles.heroMeta}>
            聚焦关键业务，掌控全局进展，让每一辆好车更快触达用户。
          </p>
        </div>
      </section>
      <section className={styles.section} aria-labelledby="quick-title">
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="quick-title">快捷入口</h2>
            <p>高频业务场景，一键直达</p>
          </div>
        </div>
        <nav className={styles.quickGrid} aria-label="业务模块快捷入口">
          {quickLinks.map((item) => (
            <Link
              className={styles.quickCard}
              href={item.href}
              key={item.label}
            >
              <IconTile icon={item.icon} tone={item.tone} />
              <span className={styles.quickCopy}>
                <strong>{item.label}</strong>
                <small>{item.desc}</small>
              </span>
              <WorkbenchIcon name="arrow" className={styles.arrow} />
            </Link>
          ))}
        </nav>
      </section>
      <section
        className={styles.section}
        id="attention"
        aria-labelledby="attention-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="attention-title">待办与异常</h2>
            <p>关注重要事项，及时处理，保障业务顺畅运行</p>
          </div>
          <Link href="/overview">
            查看全部 <WorkbenchIcon name="arrow" />
          </Link>
        </div>
        <div className={styles.fourGrid}>
          {attention.map((item) => (
            <Link
              className={`${styles.attentionCard} ${styles[item.tone]}`}
              href={item.href}
              key={item.title}
            >
              <IconTile icon={item.icon} tone={item.tone} />
              <div className={styles.cardCopy}>
                <strong>{item.title}</strong>
                <span className={styles.value} aria-label="数据尚未接入">
                  — <small>待接入</small>
                </span>
                <p>{item.desc}</p>
              </div>
              <WorkbenchIcon name="arrow" className={styles.arrow} />
            </Link>
          ))}
        </div>
      </section>
      <section
        className={styles.section}
        id="overview"
        aria-labelledby="metrics-title"
      >
        <div className={styles.sectionHeading}>
          <div>
            <h2 id="metrics-title">今日关键指标</h2>
            <p>掌握核心业务数据，辅助决策</p>
          </div>
          <span className={styles.dataStatus}>
            <span className={styles.statusDot} />
            等待业务数据接入
          </span>
        </div>
        <div className={styles.fourGrid}>
          {metrics.map((item) => (
            <Link
              className={`${styles.metricCard} ${styles[item.tone]}`}
              href={item.href}
              key={item.title}
            >
              <IconTile icon={item.icon} tone={item.tone} />
              <div className={styles.cardCopy}>
                <strong>{item.title}</strong>
                <span className={styles.value} aria-label="数据尚未接入">
                  —
                </span>
                <p>{item.source}</p>
              </div>
              <span className={styles.miniGrid} aria-hidden="true" />
              <WorkbenchIcon name="arrow" className={styles.metricArrow} />
            </Link>
          ))}
        </div>
      </section>
      <WorkbenchPanels />
      <p className={styles.dataNote}>
        工作台仅展示已接入的真实业务数据；尚未接入的指标以「—」表示。
      </p>
    </AppShell>
  );
}

