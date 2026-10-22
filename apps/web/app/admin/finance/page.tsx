import AdminScreen from "../../_design/renderer";
import type { Screen } from "../../_design";

export const metadata = { title: "财务结算 · ALSVID Admin" };

// Real domain workspaces, not imported static design fixtures.
const screen: Screen = {
  id: "finance",
  area: "财务",
  route: "/admin/finance",
  title: "财务结算",
  subtitle: "财务单据、应收应付、收付款与结算、汇率与到岸成本",
  sourceNode: "module:finance",
  blocks: [],
};

export default function Page() {
  return <AdminScreen screen={screen} />;
}
