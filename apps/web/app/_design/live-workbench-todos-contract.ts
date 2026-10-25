/**
 * Workbench todo contract: derive actionable Admin items from existing
 * authorized APIs. Counts and lists are snapshots of records the current
 * session can read — never fabricated KPIs or implied business acceptance.
 */

export type TodoSourceKey = 'publications' | 'service-cases' | 'storefront-orders';
export type TodoSourceState = 'loading' | 'ready' | 'unauthorized' | 'unavailable';

export type TodoItem = {
  id: string;
  source: TodoSourceKey;
  title: string;
  status: string;
  href: string;
  detail: string;
};

export type TodoSourceResult =
  | { state: 'loading' }
  | { state: 'ready'; items: readonly TodoItem[]; checkedAt: string }
  | { state: 'unauthorized'; reason: 'login' | 'permission' }
  | { state: 'unavailable'; reason: string };

export type TodoSourceDef = {
  key: TodoSourceKey;
  label: string;
  path: string;
  href: string;
};

export const TODO_SOURCES: readonly TodoSourceDef[] = [
  {
    key: 'publications',
    label: '商品发布',
    path: '/v1/product/publications',
    href: '/admin/ecommerce/publications',
  },
  {
    key: 'service-cases',
    label: '售后工单',
    path: '/v1/service/cases',
    href: '/admin/after-sales',
  },
  {
    key: 'storefront-orders',
    label: '商城订单',
    path: '/v1/commerce/storefront/summary',
    href: '/admin/ecommerce/orders',
  },
];

const OPEN_CASE_STATUSES = new Set(['NEW', 'TRIAGED', 'IN_PROGRESS']);
const ATTENTION_ORDER_STATUSES = new Set(['DRAFT', 'SUBMITTED', 'AWAITING_PAYMENT']);
const PUBLICATION_ATTENTION = new Set(['DRAFT', 'IN_REVIEW']);

const publicationStatusLabel: Record<string, string> = {
  DRAFT: '草稿待完善',
  IN_REVIEW: '待审核发布',
};
const caseStatusLabel: Record<string, string> = {
  NEW: '待受理',
  TRIAGED: '已分诊',
  IN_PROGRESS: '处理中',
};
const orderStatusLabel: Record<string, string> = {
  DRAFT: '内部草稿',
  SUBMITTED: '已提交待支付',
  AWAITING_PAYMENT: '等待支付',
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Pure parser used by the UI and unit tests. Never invents rows. */
export function parseTodoSource(
  source: TodoSourceDef,
  payload: unknown,
  checkedAt: string,
): TodoSourceResult {
  if (!payload || typeof payload !== 'object' || !('data' in payload)) {
    return { state: 'unavailable', reason: '接口返回格式不正确' };
  }
  const data = (payload as { data: unknown }).data;

  if (source.key === 'publications') {
    if (!Array.isArray(data)) return { state: 'unavailable', reason: '发布列表格式不正确' };
    const items: TodoItem[] = [];
    for (const row of data) {
      const record = asRecord(row);
      if (!record) continue;
      const status = text(record.status);
      if (!PUBLICATION_ATTENTION.has(status)) continue;
      const code = text(record.model_code) || text(record.model_id) || '未命名型号';
      const id = text(record.model_id) || code;
      items.push({
        id: `publication:${id}`,
        source: 'publications',
        title: `${code} · 商品发布`,
        status: publicationStatusLabel[status] ?? status,
        href: source.href,
        detail: status === 'IN_REVIEW' ? '等待授权发布到官网目录' : '完善三语标题与素材后可提交审核',
      });
    }
    return { state: 'ready', items, checkedAt };
  }

  if (source.key === 'service-cases') {
    if (!Array.isArray(data)) return { state: 'unavailable', reason: '售后工单列表格式不正确' };
    const items: TodoItem[] = [];
    for (const row of data) {
      const record = asRecord(row);
      if (!record) continue;
      const status = text(record.status);
      if (!OPEN_CASE_STATUSES.has(status)) continue;
      const caseNumber = text(record.caseNumber) || text(record.case_number) || text(record.id);
      const title = text(record.title);
      items.push({
        id: `service:${text(record.id) || caseNumber}`,
        source: 'service-cases',
        title: title ? `${caseNumber} · ${title}` : `${caseNumber} · 售后工单`,
        status: caseStatusLabel[status] ?? status,
        href: source.href,
        detail: '需在售后工作台继续分诊或处理',
      });
    }
    return { state: 'ready', items, checkedAt };
  }

  if (source.key === 'storefront-orders') {
    const record = asRecord(data);
    if (!record || !Array.isArray(record.orders)) {
      return { state: 'unavailable', reason: '商城订单摘要格式不正确' };
    }
    const items: TodoItem[] = [];
    for (const row of record.orders) {
      const order = asRecord(row);
      if (!order) continue;
      const status = text(order.status);
      if (!ATTENTION_ORDER_STATUSES.has(status)) continue;
      const number = text(order.orderNumber) || text(order.order_number) || text(order.id);
      items.push({
        id: `order:${text(order.id) || number}`,
        source: 'storefront-orders',
        title: `${number} · 自建商城订单`,
        status: orderStatusLabel[status] ?? status,
        href: source.href,
        detail:
          status === 'DRAFT'
            ? '内部草稿：尚未有已核验付款证据'
            : '支付通道未接入前无法继续流转；勿当作已收款',
      });
    }
    return { state: 'ready', items, checkedAt };
  }

  return { state: 'unavailable', reason: '未知待办来源' };
}

export function mergeTodoItems(results: readonly TodoSourceResult[]): {
  items: TodoItem[];
  readyCount: number;
  blocked: number;
} {
  const items: TodoItem[] = [];
  let readyCount = 0;
  let blocked = 0;
  for (const result of results) {
    if (result.state === 'ready') {
      readyCount += 1;
      items.push(...result.items);
    } else if (result.state === 'unauthorized' || result.state === 'unavailable') {
      blocked += 1;
    }
  }
  return { items, readyCount, blocked };
}
