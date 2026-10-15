import AdminScreen from "../../_design/renderer";
import { screenById } from "../../_design";

export const metadata = { title: "供应链中心 · ALSVID" };

export default function Page() {
  return <AdminScreen screen={screenById("supply")} />;
}
