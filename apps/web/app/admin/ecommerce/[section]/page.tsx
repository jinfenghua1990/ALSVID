import AdminScreen from "../../../_design/renderer";
import type { Screen } from "../../../_design";
import { notFound } from "next/navigation";

const ecommerceSections = {
  publications: { id: "ecommerce-publications", title: "官网商品发布与审核", subtitle: "维护真实商品资料、三语标题、审核状态和官网公开目录。" },
  homepage: { id: "ecommerce-homepage", title: "首页商品绑定", subtitle: "将官网首页展示位关联到产品中心的真实 Model ID。" },
  inventory: { id: "ecommerce-inventory", title: "电商库存查询", subtitle: "只读查看 SKU 库位和 VIN 整车库存；台账可用量不等于商城可售量。" },
  pricing: { id: "ecommerce-pricing", title: "商城价格管理", subtitle: "按 SKU 和德国 / 奥地利市场维护 EUR 含税价格版本。" },
  orders: { id: "ecommerce-orders", title: "B2C 订单管理", subtitle: "管理第一方 B2C 订单和内部草稿；公开结账与支付尚未开放。" },
} as const;

type EcommerceSection = keyof typeof ecommerceSections;

export async function generateMetadata({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = ecommerceSections[section as EcommerceSection];
  return { title: page ? `${page.title} · ALSVID Admin` : "电商 · ALSVID Admin" };
}

export default async function EcommerceSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  const page = ecommerceSections[section as EcommerceSection];
  if (!page) notFound();

  const screen: Screen = {
    id: page.id,
    area: "电商",
    route: `/admin/ecommerce/${section}`,
    title: page.title,
    subtitle: page.subtitle,
    sourceNode: "module:ecommerce",
    blocks: [],
  };
  return <AdminScreen screen={screen} />;
}
