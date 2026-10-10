import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "ALSVID Product Center", description: "ALSVID product, asset and BOM workspace" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body style={{margin:0,fontFamily:"-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",background:"#f5f7fa",color:"#172033"}}>{children}</body></html>;
}
