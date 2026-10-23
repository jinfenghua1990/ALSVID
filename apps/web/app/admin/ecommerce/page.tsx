import AdminScreen from "../../_design/renderer";
import type { Screen } from "../../_design";

export const metadata = { title: "电商运营 · ALSVID Admin" };

// Real domain workspaces, not imported static design fixtures.
const screen: Screen = {
  id: "ecommerce",
  area: "电商",
  route: "/admin/ecommerce",
  title: "电商运营工作台",
  subtitle: "电商业务入口与待接入能力总览；商品、库存、价格和订单分别进入独立工作区。",
  sourceNode: "module:ecommerce",
  blocks: [],
};

export default function Page() {
  return <AdminScreen screen={screen} />;
}
