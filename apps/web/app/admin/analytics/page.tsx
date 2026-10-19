import AdminScreen from "../../_design/renderer";
import { screenById } from "../../_design";

export const metadata = { title: "数据总览 · ALSVID" };

export default function Page() {
  return <><AdminScreen screen={screenById("analytics")} /><div style={{padding:"12px 32px 32px"}}><a href="/admin/analytics/color-interest" style={{display:"inline-block",padding:"12px 18px",border:"1px solid #cdd9e0",borderRadius:8,textDecoration:"none",color:"#173849"}}>查看 FC1 颜色偏好统计 →</a></div></>;
}
