'use client';

import { useState } from 'react';

export function DesignForm({ title, hint, fields }: { title: string; hint?: string; fields: { label: string; value: string }[] }) {
  const [values, setValues] = useState(fields.map(field => field.value));
  return <section className="av-card av-design-form"><h2 className="av-cardtitle">{title}</h2>{hint && <p className="av-cardhint">{hint}</p>}
    {fields.map((field,i) => <label className="av-design-field" key={`${field.label}-${i}`}><span>{field.label}</span><textarea rows={(values[i]?.length ?? 0) > 65 ? 3 : 2} value={values[i] ?? field.value} onChange={event => setValues(current => current.map((value,j) => i === j ? event.target.value : value))} /></label>)}
    <div className="av-toolbar"><button className="av-btn" type="button" onClick={() => setValues(fields.map(field => field.value))}>重置示例</button><span className="av-cardhint">可编辑本页示例，离开页面后不保存，不执行实际业务。</span></div>
  </section>;
}
