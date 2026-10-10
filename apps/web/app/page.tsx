const domains = [
  ['Product', 'Platforms, models, SKUs and released engineering'],
  ['Supply', 'Procurement, production, inventory and logistics'],
  ['Commerce', 'Channels, orders and fulfillment mappings'],
  ['Vehicle', 'Vehicle birth, lifecycle, ownership and 360 view'],
  ['Partners', 'Suppliers, factories, dealers and customers'],
  ['Finance', 'Invoices, obligations, payments and settlement'],
  ['Service', 'Warranty, service cases and repair history'],
  ['Communication', 'Email, consent, campaigns and customer follow-up'],
] as const;

export default function HomePage() {
  return (
    <main className="shell">
      <aside className="rail">
        <div className="brand">ALSVID</div>
        <nav>
          <a className="active" href="#overview">Overview</a>
          {domains.map(([name]) => <a key={name} href={name === 'Partners' ? '/partners' : `#${name.toLowerCase()}`}>{name}</a>)}
        </nav>
        <div className="railFoot">Clean-slate V1</div>
      </aside>

      <section className="workspace" id="overview">
        <header className="topbar">
          <div><div className="eyebrow">ALSVID CONTROL PLANE</div><h1>One operating system for every bicycle journey.</h1></div>
          <a className="status" href="/login"><span /> Sign in</a>
        </header>
        <div className="hero"><p>From engineering release and factory production to Europe, dealer handover, ownership, service and lifetime customer communication.</p><div className="flow">Product <b>→</b> Supply <b>→</b> Vehicle <b>→</b> Dealer <b>→</b> Customer <b>→</b> Service</div></div>
        <div className="grid">{domains.map(([name, description]) => <article className="card" id={name.toLowerCase()} key={name}><div className="cardTop"><span className="dot" /><span>DOMAIN</span></div><h2>{name}</h2><p>{description}</p><div className="cardFoot">{name === 'Partners' ? <a href="/partners">Identity + Partner foundation live →</a> : 'Designed · implementation queued'}</div></article>)}</div>
      </section>
    </main>
  );
}
