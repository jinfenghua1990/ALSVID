import AdminScreen from "../_design/renderer";
import { screenById } from "../_design";

export const metadata = { title: "工作台 · ALSVID" };

export default function Page() {
  return <AdminScreen screen={screenById("workbench")} />;
}
