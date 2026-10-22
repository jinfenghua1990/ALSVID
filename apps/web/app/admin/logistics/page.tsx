import AdminScreen from "../../_design/renderer";
import type { Screen } from "../../_design";

export const metadata = { title: "出口物流与交付 · ALSVID Admin" };

// Real domain workspaces, not imported static design fixtures.
const screen: Screen = {
  id: "logistics",
  area: "物流",
  route: "/admin/logistics",
  title: "出口物流与交付",
  subtitle: "运输计划、出入境申报、物流里程碑与交付执行事实",
  sourceNode: "module:logistics",
  blocks: [],
};

export default function Page() {
  return <AdminScreen screen={screen} />;
}
