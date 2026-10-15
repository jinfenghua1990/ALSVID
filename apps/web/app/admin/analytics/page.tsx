import AdminScreen from "../../_design/renderer";
import { screenById } from "../../_design";

export const metadata = { title: "数据总览 · ALSVID" };

export default function Page() {
  return <AdminScreen screen={screenById("analytics")} />;
}
