import { AppShell } from '@alsvid/ui';
import { navigationFor } from './app-navigation';

const domains = [
  ['Product', 'Platforms, models, SKUs and released engineering'],
  ['Supply', 'Procurement, production, inventory and export logistics'],
  ['Commerce', 'External channels, orders, fulfillment mappings and reconciliation'],
  ['Vehicle', 'Vehicle birth, lifecycle, ownership and 360 view'],
  ['Dealer', 'Dealer network status, markets, capabilities and operations'],
  ['Partners', 'Suppliers, factories, dealers and customers'],
  ['Finance', 'Invoices, obligations, payments and settlement'],
  ['Service', 'Warranty, service cases and repair history'],
  ['Communication', 'Email, consent, campaigns and customer follow-up'],
] as const;

function domainStatus(name: string) {
  if (name === 'Product') return <a href="/product">Product + Engineering foundation live →</a>;
  if (name === 'Supply') return <span><a href="/supply">Procurement</a> · <a href="/production">Production</a> · <a href="/inventory">Inventory</a> · <a href="/logistics">Export Logistics</a> live</span>;
  if (name === 'Commerce') return <a href="/commerce">Shopify facts + reconciliation foundation live →</a>;
  if (name === 'Vehicle') return <a href="/production">Vehicle Birth registry live · 360 queued →</a>;
  if (name === 'Dealer') return <a href="/dealers">Dealer network foundation live →</a>;
  if (name === 'Partners') return <a href="/partners">Identity + Partner foundation live →</a>;
  return 'Designed · implementation queued';
}

export default function HomePage() {
  return (
    <AppShell navigation={navigationFor('/')} footer="Clean-slate V1" workspaceId="overview">
      <header className="topbar">
        <div><div className="eyebrow">ALSVID CONTROL PLANE</div><h1>One operating system for every bicycle journey.</h1></div>
        <a className="status" href="/login"><span /> Sign in</a>
      </header>
      <div className="hero"><p>From engineering release and factory production to Europe, dealer handover, ownership, service and lifetime customer communication.</p><div className="flow">Product <b>→</b> Supply <b>→</b> Commerce <b>→</b> Vehicle <b>→</b> Dealer <b>→</b> Customer <b>→</b> Service</div></div>
      <div className="grid">{domains.map(([name, description]) => <article className="card" id={name.toLowerCase()} key={name}><div className="cardTop"><span className="dot" /><span>DOMAIN</span></div><h2>{name}</h2><p>{description}</p><div className="cardFoot">{domainStatus(name)}</div></article>)}</div>
    </AppShell>
  );
}
