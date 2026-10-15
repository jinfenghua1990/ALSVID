import AdminScreen from "../../../_design/renderer";
import { screenById } from "../../../_design";

export const metadata = { title: "客户详情 · ALSVID" };

export default function Page() {
  return <AdminScreen screen={screenById("customer-detail")} />;
}
