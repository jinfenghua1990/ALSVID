'use client';

import { useRef, useState, type FormEvent } from 'react';
import { translator, type Locale } from '../../_lib/i18n';
import styles from './network.module.css';

type Status = 'idle' | 'sending' | 'success' | 'error' | 'limited';
export function DealerApplicationForm({locale}:{locale:Locale}) {
 const t=translator(locale);
 const [status,setStatus]=useState<Status>('idle');
 const [reference,setReference]=useState('');
 const requestId=useRef<string|null>(null);
 async function submit(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if(status==='sending' || status==='success')return;
  const form=event.currentTarget;
  if(!form.reportValidity())return;
  const data=new FormData(form);
  // Idempotent request identifier survives transient network retry.
  requestId.current ??= crypto.randomUUID();
  const payload={
   clientRequestId:requestId.current,
   companyName:String(data.get('companyName')??''),
   contactName:String(data.get('contactName')??''),
   email:String(data.get('email')??''),
   country:String(data.get('country')??''),
   partnershipType:String(data.get('partnershipType')??''),
   website:String(data.get('website')??''),
   message:String(data.get('message')??''),
   nickname:String(data.get('nickname')??''),
   consent:data.get('consent')==='yes',
   locale,
  };
  setStatus('sending');
  try {
   const response=await fetch('/api/public/dealer-application',{
    method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload),
   });
   const result:unknown=await response.json().catch(()=>null);
   if(response.status===429){setStatus('limited');return;}
   if(!response.ok || !result || typeof result!=='object' ||
     !('data' in result) || !result.data || typeof result.data!=='object' ||
     !('received' in result.data) || result.data.received!==true) {setStatus('error');return;}
   const saved='reference' in result.data && typeof result.data.reference==='string' ?result.data.reference:'';
   setReference(saved.slice(0,36));
   setStatus('success');
   form.reset();
  } catch {setStatus('error');}
 }
 return <div className={styles.applicationPreview}>
  {status==='success'?<div className={styles.successPanel} role="status">
   <span className={styles.successMark} aria-hidden="true">✓</span>
   <h3>{t('network.apply.successTitle')}</h3>
   <p>{t('network.apply.successBody')}</p>
   {reference?<p className={styles.reference}>{t('network.apply.reference')}: {reference}</p>:null}
  </div>:
  <form aria-label={t('network.apply.title')} onSubmit={submit} noValidate={false}>
   <div className={styles.formGrid}>
    <label>{t('network.apply.company')} <span className={styles.required}>*</span>
     <input required autoComplete="organization" name="companyName" maxLength={160} minLength={2}/></label>
    <label>{t('network.apply.country')} <span className={styles.required}>*</span>
     <select required name="country" defaultValue="">
      <option value="" disabled>{t('network.apply.choose')}</option>
      <option value="DE">{t('network.locations.de')}</option>
      <option value="AT">{t('network.locations.at')}</option>
      <option value="OTHER">{t('network.apply.other')}</option>
     </select></label>
    <label>{t('network.apply.contact')} <span className={styles.required}>*</span>
     <input required name="contactName" autoComplete="name" maxLength={120} minLength={2}/></label>
    <label>{t('network.apply.email')} <span className={styles.required}>*</span>
     <input required name="email" type="email" autoComplete="email" maxLength={254}/></label>
    <label>{t('network.apply.type')} <span className={styles.required}>*</span>
     <select required name="partnershipType" defaultValue="">
      <option value="" disabled>{t('network.apply.choose')}</option>
      <option value="retail">{t('network.modes.retail')}</option>
      <option value="demo">{t('network.modes.demo')}</option>
      <option value="service">{t('network.modes.service')}</option>
      <option value="multiple">{t('network.apply.multiple')}</option>
     </select></label>
    <label>{t('network.apply.website')}
     <input name="website" type="url" placeholder="https://" maxLength={240}/></label>
    <label className={styles.wide}>{t('network.apply.message')}
     <textarea name="message" rows={4} maxLength={1600}/></label>
    <label className={styles.honey} aria-hidden="true" tabIndex={-1}>Nickname<input name="nickname" tabIndex={-1} autoComplete="off"/></label>
   </div>
   <label className={styles.consentLine}>
    <input type="checkbox" name="consent" value="yes" required/>
    <span>{t('network.apply.consent')} <span className={styles.required}>*</span></span>
   </label>
   {status==='error'?<p className={styles.formError} role="alert">{t('network.apply.error')}</p>:null}
   {status==='limited'?<p className={styles.formError} role="alert">{t('network.apply.limited')}</p>:null}
   <button type="submit" className={styles.submitButton} disabled={status==='sending'}>
    {status==='sending'?t('network.apply.sending'):t('network.apply.pending')}
   </button>
   <p className={styles.formFootnote}>{t('network.apply.disclaimer')}</p>
  </form>}
 </div>;
}
