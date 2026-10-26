'use client';
import {useEffect,useRef,useState} from 'react';

/** Keep the native editor's own viewport inside the visible Admin workspace. */
export function NativeCatalogFrame(){
  const ref=useRef<HTMLIFrameElement>(null),[height,setHeight]=useState<number>();
  useEffect(()=>{
    let scheduled=0;
    const measure=()=>{
      scheduled=0;
      const frame=ref.current;if(!frame)return;
      const viewport=window.visualViewport;
      const available=(viewport?.height??window.innerHeight)-Math.max(0,frame.getBoundingClientRect().top-(viewport?.offsetTop??0))-20;
      setHeight(Math.max(360,Math.floor(available)));
    };
    const schedule=()=>{if(!scheduled)scheduled=window.requestAnimationFrame(measure);};
    const observer=new ResizeObserver(schedule);
    if(ref.current?.parentElement)observer.observe(ref.current.parentElement);
    window.addEventListener('resize',schedule);
    window.addEventListener('scroll',schedule,{passive:true});
    window.visualViewport?.addEventListener('resize',schedule);
    schedule();
    return()=>{
      observer.disconnect();window.cancelAnimationFrame(scheduled);
      window.removeEventListener('resize',schedule);window.removeEventListener('scroll',schedule);
      window.visualViewport?.removeEventListener('resize',schedule);
    };
  },[]);
  return <iframe ref={ref} src="/commerce-lab-native/index.html" title="CRMEB 商品管理适配版"
    style={{width:'100%',height:height??'calc(100dvh - 260px)',minHeight:360,border:0,display:'block',background:'#f5f7f9'}}/>;
}
