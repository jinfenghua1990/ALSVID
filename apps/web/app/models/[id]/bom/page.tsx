import { notFound } from "next/navigation";
import ProductBom from "./product-bom";

export default async function BomPage({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!id)notFound();return <ProductBom modelId={id}/>;}
