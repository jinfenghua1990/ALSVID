"use client";
import { useState } from "react";
import { translator, type Locale } from "../../_lib/i18n";
import styles from "./fc2-product.module.css";

const photos = [
  {id:"side",file:"side-studio",label:"fc2.gallery.side",alt:"fc2.gallery.alt.side",width:1536,height:1024},
  {id:"folded",file:"folded-studio",label:"fc2.gallery.folded",alt:"fc2.gallery.alt.folded",width:1536,height:1024},
  {id:"original",file:"side-original",label:"fc2.gallery.original",alt:"fc2.gallery.alt.original",width:1000,height:1000},
] as const;
export function Fc2Gallery({locale}:{locale:Locale}) {
  const [selected,setSelected]=useState(0);
  const t=translator(locale);
  const photo=photos[selected]!;
  return <div className={styles.gallery} data-fc2-gallery>
    <div className={styles.galleryStage} id="fc2-photo">
      <img key={photo.id} src={`/products/fc2/${photo.file}-${photo.width}.webp`}
        srcSet={photo.width === 1536 ? `/products/fc2/${photo.file}-768.webp 768w, /products/fc2/${photo.file}-1536.webp 1536w` : undefined}
        sizes="(max-width: 760px) 100vw, 62vw" width={photo.width} height={photo.height}
        alt={t(photo.alt)} fetchPriority="high" data-photo={photo.id} />
      <span className={styles.imageIndex} aria-hidden="true">0{selected+1} / 03</span>
    </div>
    <div className={styles.galleryControls} role="group" aria-label={t("fc2.gallery")}
      onKeyDown={event=>{ if(event.key==="ArrowRight"||event.key==="ArrowLeft"){event.preventDefault();const next=(selected+(event.key==="ArrowRight"?1:-1)+photos.length)%photos.length;setSelected(next);event.currentTarget.querySelectorAll("button")[next]?.focus();}}}>
      {photos.map((item,index)=><button key={item.id} type="button" aria-pressed={selected===index} aria-controls="fc2-photo" onClick={()=>setSelected(index)}>{t(item.label)}</button>)}
    </div>
    <p id="fc2-photo-caption" className={styles.photoNote}>{t("fc2.photo.note")}</p>
  </div>;
}
