"use client";
import { useState } from "react";
import Link from "next/link";
import { WorkbenchIcon } from "./workbench-icon";
import { LiveWorkbenchTodos } from "../_design/live-workbench-todos";
import styles from "./workbench.module.css";
function PanelHeader({ title, href }: { title: string; href: string }) {
  return (
    <div className={styles.panelHeading}>
      <h3>{title}</h3>
      <Link href={href}>
        查看更多 <WorkbenchIcon name="arrow" />
      </Link>
    </div>
  );
}
export function WorkbenchPanels() {
  const [activity, setActivity] = useState("全部");
  const [trend, setTrend] = useState("订单趋势");
  return (
    <section
      className={styles.panels}
      aria-label="业务动态、数据分析与最近任务"
    >
      <article className={styles.panel}>
        <PanelHeader title="业务动态" href="/admin" />
        <div className={styles.tabs} role="group" aria-label="业务动态分类">
          {["全部", "订单", "生产", "库存", "售后"].map((label) => (
            <button
              type="button"
              key={label}
              aria-pressed={activity === label}
              className={activity === label ? styles.selected : undefined}
              onClick={() => setActivity(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.empty} role="status">
          <span className={`${styles.emptyIcon} ${styles.blue}`}>
            <WorkbenchIcon name="clipboard" />
          </span>
          <strong>暂无{activity === "全部" ? "业务" : activity}动态</strong>
          <p>业务记录接入后，最新进展将在这里展示。</p>
        </div>
      </article>
      <article className={styles.panel}>
        <PanelHeader title="数据分析" href="/admin" />
        <div className={styles.tabs} role="group" aria-label="数据趋势分类">
          {["订单趋势", "生产趋势", "库存趋势", "售后趋势"].map((label) => (
            <button
              type="button"
              key={label}
              aria-pressed={trend === label}
              className={trend === label ? styles.selected : undefined}
              onClick={() => setTrend(label)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className={styles.chartEmpty} role="status">
          <div className={styles.chartGrid} aria-hidden="true" />
          <span className={styles.chartLabel}>
            <WorkbenchIcon name="chart" />
            <strong>{trend}尚无数据</strong>
            <small>接入真实记录后显示趋势</small>
          </span>
        </div>
      </article>
      <article className={styles.panel} aria-label="最近任务">
        <LiveWorkbenchTodos />
      </article>
    </section>
  );
}
