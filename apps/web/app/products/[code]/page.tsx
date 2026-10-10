import { notFound } from "next/navigation";
import ProductAssets from "./product-assets";

export default async function ProductPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (code !== "FC1") notFound();
  return <ProductAssets code={code} />;
}
