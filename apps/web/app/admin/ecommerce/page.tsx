import AdminScreen from "../../_design/renderer";
import type { Screen } from "../../_design";

export const metadata = { title: "电商运营 · ALSVID Admin" };

// Real domain workspaces, not imported static design fixtures.
const screen: Screen = {
  id: "ecommerce",
  area: "电商",
  route: "/admin/ecommerce",
  title: "电商运营",
  subtitle: "官网商品审核与发布、首页商品绑定、德国/奥地利售价与 B2C 商城订单",
  sourceNode: "module:ecommerce",
  blocks: [],
};

export default function Page() {
  return <AdminScreen screen={screen} />;
}
