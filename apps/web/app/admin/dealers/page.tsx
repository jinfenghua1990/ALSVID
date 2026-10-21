import AdminScreen from "../../_design/renderer";
import { screenById } from "../../_design";

export const metadata = { title: "经销商中心 · ALSVID" };

export default function Page() {
  return <><div style={{padding:"14px 28px",background:"#eef6f0",display:"flex",alignItems:"center",gap:18}}><span style={{fontSize:14}}>官网招商申请</span><a href="/admin/dealers/applications" style={{color:"#186044",fontWeight:700}}>查看申请记录 →</a></div><a href="/admin/dealers/test-rides" style={{display:"inline-block",padding:"10px 28px",color:"#186044",fontWeight:700}}>客户试骑申请与合作网点 →</a><AdminScreen screen={screenById("dealers")} /></>;
}
