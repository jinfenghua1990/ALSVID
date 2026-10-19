"use client";
import { useState } from "react";
import { translator, type Locale } from "../../_lib/i18n";
import styles from "./x5-product.module.css";

const photos = [
  {id:"side",file:"side-studio",label:"x5.gallery.side",alt:"x5.gallery.alt.side",width:1536,height:1024},
  {id:"folded",file:"folded-studio",label:"x5.gallery.folded",alt:"x5.gallery.alt.folded",width:1536,height:1024},
  {id:"original",file:"side-original",label:"x5.gallery.original",alt:"x5.gallery.alt.original",width:1000,height:1000},
] as const;
export function X5Gallery({locale}:{locale:Locale}) {
  const [selected,setSelected]=useState(0);
  const t=translator(locale);
  const photo=photos[selected]!;
  return <div className={styles.gallery} data-x5-gallery>
    <div className={styles.galleryStage} id="x5-photo">
      <img key={photo.id} src={`/products/x5/${photo.file}-${photo.width}.webp`}
        srcSet={photo.width === 1536 ? `/products/x5/${photo.file}-768.webp 768w, /products/x5/${photo.file}-1536.webp 1536w` : undefined}
        sizes="(max-width: 760px) 100vw, 62vw" width={photo.width} height={photo.height}
        alt={t(photo.alt)} fetchPriority="high" data-photo={photo.id} />
      <span className={styles.imageIndex} aria-hidden="true">0{selected+1} / 03</span>
    </div>
    <div className={styles.galleryControls} role="group" aria-label={t("x5.gallery")}
      onKeyDown={event=>{ if(event.key==="ArrowRight"||event.key==="ArrowLeft"){event.preventDefault();const next=(selected+(event.key==="ArrowRight"?1:-1)+photos.length)%photos.length;setSelected(next);event.currentTarget.querySelectorAll("button")[next]?.focus();}}}>
      {photos.map((item,index)=><button key={item.id} type="button" aria-pressed={selected===index} aria-controls="x5-photo" onClick={()=>setSelected(index)}>{t(item.label)}</button>)}
    </div>
    <p id="x5-photo-caption" className={styles.photoNote}>{t("x5.photo.note")}</p>
  </div>;
}
