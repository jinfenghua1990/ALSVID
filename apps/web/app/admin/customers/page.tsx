import AdminScreen from "../../_design/renderer";
import { screenById } from "../../_design";

export const metadata = { title: "客户/车主中心 · ALSVID" };

export default function Page() {
  return <AdminScreen screen={screenById("customers")} />;
}
