import AdminScreen from "../../_design/renderer";
import { screenById } from "../../_design";

export const metadata = { title: "角色与权限 · ALSVID" };

export default function Page() {
  return <AdminScreen screen={screenById("settings")} />;
}
