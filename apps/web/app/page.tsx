import Link from "next/link";

export default function Home() {
  return <main style={{maxWidth:1080,margin:"0 auto",padding:"64px 24px"}}>
    <p style={{color:"#667085",margin:0}}>ALSVID</p><h1 style={{fontSize:42,margin:"10px 0"}}>Product Center</h1>
    <p style={{color:"#667085",lineHeight:1.7}}>Manage ALSVID products, engineering models, BOM revisions and product assets.</p>
    <Link href="/products/FC1" style={{color:"#175cd3",fontWeight:600}}>Open FC1 product →</Link>
  </main>;
}
