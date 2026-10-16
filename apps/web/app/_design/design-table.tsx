'use client';

import { useState } from 'react';
import type { Block, Cell } from './types';

const text = (cell: Cell) => typeof cell === 'string' ? cell : cell.text;

export function DesignTable({ block }: { block: Extract<Block, { kind: 'table' }> }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState(block.filters?.[0] ?? '');
  const rows = block.rows.filter(row => {
    const value = row.map(text).join(' ').toLocaleLowerCase();
    return value.includes(query.trim().toLocaleLowerCase()) && (!filter || filter === block.filters?.[0] || value.includes(filter.toLocaleLowerCase()));
  });
  return <section className="av-card">
    <div className="av-cardhead"><div><h2 className="av-cardtitle">{block.title}</h2>{block.hint && <p className="av-cardhint">{block.hint}</p>}</div></div>
    <div className="av-toolbar" style={{ marginBottom: 12 }}>
      <input className="av-search" type="search" placeholder={block.search || '搜索本页示例记录'} aria-label={`${block.title}：搜索`} value={query} onChange={event => setQuery(event.target.value)} />
      {(block.filters ?? []).map(item => <button key={item} type="button" className="av-chip" data-active={filter === item} onClick={() => setFilter(item)}>{item}</button>)}
    </div>
    <div className="av-tablewrap"><table className="av-table"><thead><tr>{block.columns.map((column,i) => <th scope="col" key={`${column}-${i}`}>{column}</th>)}</tr></thead><tbody>
      {rows.map((row,i) => <tr key={i}>{row.map((cell,j) => <td key={j} className={j === 0 ? 'av-strong' : undefined}>{typeof cell === 'string' ? cell : <span className="av-tag" data-tone={cell.tone || 'neutral'}>{cell.text}</span>}</td>)}</tr>)}
      {!rows.length && <tr><td colSpan={block.columns.length}>没有匹配的示例记录</td></tr>}
    </tbody></table></div>
    <p className="av-cardhint" role="status">显示 {rows.length} / {block.rows.length} 条示例记录</p>
  </section>;
}
