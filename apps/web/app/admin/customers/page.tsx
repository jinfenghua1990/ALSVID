import AdminScreen from "../../_design/renderer";
import { screenById } from "../../_design";

export const metadata = { title: "客户/车主中心 · ALSVID" };

export default function Page() {
  return <><a href="/admin/dealers/test-rides" style={{display:"inline-block",padding:"16px 28px",color:"#186044",fontWeight:700}}>查看试骑客户意向 →</a><AdminScreen screen={screenById("customers")} /></>;
}
