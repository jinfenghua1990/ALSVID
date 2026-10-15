import AdminScreen from "../../../_design/renderer";
import { screenById } from "../../../_design";

export const metadata = { title: "VIN 管理 · ALSVID" };

export default function Page() {
  return <AdminScreen screen={screenById("vin")} />;
}
