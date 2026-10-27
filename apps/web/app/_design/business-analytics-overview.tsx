/**
 * Business-analysis information architecture. Only confirmed first-party metrics
 * may show numbers: pending events, funnels and finance/refund integrations remain
 * explicitly unavailable rather than using guessed zeros or synthetic records.
 */
const metricGroups = [
  { title: '流量与访客', description: '访客数、浏览量、来源渠道、新老访客', fields: ['独立访客 UV', '页面浏览 PV', '来源渠道', '新访客占比'] },
  { title: '页面与转化', description: '页面跳转、商品兴趣、加购、结账与各环节流失', fields: ['页面跳转路径', '商品详情到加购', '结账转化率', '关键环节流失率'] },
  { title: '交易与销售', description: '只引用已确认的商城订单、支付与退款事实', fields: ['支付订单数', '支付金额', '客单价', '支付转化率'] },
  { title: '售后与退款', description: '明确退款口径、售后申请和订单关联', fields: ['退款订单数', '退款金额', '退款率', '售后工单率'] },
] as const;

export function BusinessAnalyticsOverview() {
  return (
    <section className="av-analytics-business" aria-label="经营分析框架">
      <div className="av-analytics-business-intro">
        <h2>经营分析</h2>
        <p>按生意参谋式经营流程组织：流量 → 浏览 → 加购 → 下单 → 支付 → 售后。仅显示可核实的数据，缺少埋点或订单归因时不显示虚构指标。</p>
      </div>
      <div className="av-analytics-business-grid">
        {metricGroups.map(group => (
          <section className="av-card av-analytics-business-card" key={group.title}>
            <h3>{group.title}</h3>
            <p>{group.description}</p>
            <table aria-label={group.title + '指标'}>
              <tbody>{group.fields.map(field => <tr key={field}><th scope="row">{field}</th><td>待接入数据源</td></tr>)}</tbody>
            </table>
          </section>
        ))}
      </div>
      <section className="av-card">
        <h3>已接入专题</h3>
        <p>目前已接通 FC1 颜色兴趣的独立统计页面。它是产品兴趣参考，不能替代整个商城的访问量、销售额或退款率。</p>
        <a className="av-btn" href="/admin/analytics/color-interest">查看 FC1 颜色兴趣分析</a>
      </section>
    </section>
  );
}
