import { Download, FileSpreadsheet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { customerById, PRODUCTS } from '../sim/catalog'
import { monthStart } from '../sim/dates'
import type { EmberApi } from '../sim/useEmber'
import { csv, exportOrders, PageHead } from '../components/shared'
import { Button, Card, Delta, eur0, IconTile, KpiTile, Legend, LimitBar, num, pct, PnlChart, trendOf } from '../components/ui'
import { Coffee, Receipt, ShoppingBag, Wallet } from 'lucide-react'

export function Sales({ api }: { api: EmberApi }) {
  const m = api.pnl
  const cur = m.at(-1)!, prev = m.at(-2)!
  const from = monthStart(api.today)
  const top = useMemo(() => {
    const rev: Record<string, number> = {}, units: Record<string, number> = {}
    for (const o of api.orders) if (o.day >= from && o.status !== 'refunded') for (const l of o.lines) { rev[l.productId] = (rev[l.productId] ?? 0) + l.qty * l.price; units[l.productId] = (units[l.productId] ?? 0) + l.qty }
    return PRODUCTS.map(p => ({ p, rev: rev[p.id] ?? 0, units: units[p.id] ?? 0 })).sort((a, b) => b.rev - a.rev).slice(0, 6)
  }, [api.orders, from])
  const max = Math.max(...m.map(x => x.revenue))
  return (
    <>
      <PageHead title="Sales" subtitle="Revenue by month, including VAT and shipping, net of refunds." />
      <div className="kpi-row">
        <KpiTile hero label="Revenue this month" value={eur0(cur.revenue)} delta={pct(api.kpis.revenueDelta)} trend={trendOf(api.kpis.revenueDelta)} period="vs same days last month" icon={Wallet} />
        <KpiTile label="Last month" value={eur0(prev.revenue)} delta={pct((prev.revenue - m.at(-3)!.revenue) / m.at(-3)!.revenue)} trend={trendOf(prev.revenue - m.at(-3)!.revenue)} period={`vs ${m.at(-3)!.label}`} icon={Receipt} />
        <KpiTile label="Orders this month" value={num(cur.orders)} delta={pct(api.kpis.ordersDelta)} trend={trendOf(api.kpis.ordersDelta)} period="vs same days last month" icon={ShoppingBag} />
        <KpiTile label="Avg. order value" value={`€${api.kpis.aov.toFixed(2)}`} delta={pct(api.kpis.aovDelta)} trend={trendOf(api.kpis.aovDelta)} period="this month" icon={Coffee} />
      </div>
      <div className="row row-2">
        <Card title="Revenue by month" subtitle="Last 8 months; the current month is to date">
          <div className="bars" role="img" aria-label={m.map(x => `${x.label} ${eur0(x.revenue)}`).join(', ')}>
            {m.map((x, i) => <div key={x.label} className="bars-col"><span className="t-caption c-secondary tnum">{eur0(x.revenue / 1000)}k</span><span className="bars-bar" data-current={i === m.length - 1 || undefined} style={{ height: `${(x.revenue / max) * 100}%` }} /><span className="t-caption c-secondary">{x.label}</span></div>)}
          </div>
        </Card>
        <Card title="Best sellers" subtitle="This month">
          <ul className="list">{top.map(t => <li key={t.p.id}><IconTile icon={Coffee} tone="inset" size={40} /><span className="list-text grow"><span className="t-body-medium">{t.p.name}</span><span className="t-caption c-secondary">{num(t.units)} sold · {eur0(t.p.price)} each</span></span><span className="t-numeric tnum">{eur0(t.rev)}</span></li>)}</ul>
        </Card>
      </div>
    </>
  )
}

const LINES: [string, 'cogs' | 'fees' | 'marketing' | 'payroll' | 'rent' | 'supplies'][] = [['Cost of goods', 'cogs'], ['Payment fees and labels', 'fees'], ['Marketing', 'marketing'], ['Payroll', 'payroll'], ['Rent and software', 'rent'], ['Supplies', 'supplies']]
export function Pnl({ api }: { api: EmberApi }) {
  const [sel, setSel] = useState(api.pnl.length - 2)
  const m = api.pnl[sel] ?? api.pnl.at(-1)!
  const prev = api.pnl[sel - 1]
  return (
    <>
      <PageHead title="Profit & loss" subtitle="Select a month to see its lines. The current month is to date." />
      <div className="row row-2">
        <Card title="Last 8 months">
          <div className="well"><div className="well-head"><span className="t-label">Profit and loss</span><Legend items={[{ label: 'Profit', series: 'accent' }, { label: 'Costs', series: 'neutral' }]} /></div><PnlChart months={api.pnl} height={240} selected={sel} onSelect={setSel} /></div>
        </Card>
        <Card title={`${m.label}${sel === api.pnl.length - 1 ? ' (to date)' : ''}`} subtitle={`${num(m.orders)} orders`}>
          <dl className="ledger">
            <div><dt className="t-body-strong">Revenue</dt><dd className="t-numeric tnum">{eur0(m.revenue)}</dd></div>
            {LINES.map(([label, k]) => <div key={k}><dt className="t-body">{label}</dt><dd className="t-numeric tnum">−{eur0(m[k])}</dd></div>)}
            <div className="total"><dt className="t-body-strong">Profit</dt><dd className="t-numeric tnum" data-tone={m.profit >= 0 ? 'positive' : 'negative'}>{eur0(m.profit)}</dd></div>
          </dl>
          <p className="delta-row"><span className="t-caption c-secondary">Margin {pct(m.revenue ? m.profit / m.revenue : 0)}</span>{prev && <><Delta trend={trendOf(m.profit - prev.profit)}>{pct(prev.profit ? (m.profit - prev.profit) / Math.abs(prev.profit) : 0)}</Delta><span className="t-caption c-secondary">profit vs {prev.label}</span></>}</p>
        </Card>
      </div>
    </>
  )
}

export function CashFlow({ api }: { api: EmberApi }) {
  const max = Math.max(...api.pnl.map(m => Math.max(m.revenue, m.costs)))
  return (
    <>
      <PageHead title="Cash flow" subtitle="Money in from sales and money out for costs, by month." />
      <Card>
        <ul className="list cash">
          {[...api.pnl].reverse().map(m => (
            <li key={m.label}>
              <span className="t-h3 cash-month">{m.label}</span>
              <span className="list-text grow">
                <span className="split t-caption c-secondary"><span>In {eur0(m.revenue)}</span><span>Out {eur0(m.costs)}</span></span>
                <LimitBar value={m.revenue / max} label={`${m.label} money in`} />
                <span className="cash-out"><LimitBar value={m.costs / max} label={`${m.label} money out`} /></span>
              </span>
              <span className="t-numeric tnum" data-tone={m.profit >= 0 ? 'positive' : 'negative'}>{m.profit >= 0 ? '+' : ''}{eur0(m.profit)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </>
  )
}

export function Exports({ api }: { api: EmberApi }) {
  const from = monthStart(api.today)
  const items = [
    { name: 'Orders this month', detail: 'Order, date, customer, items, total, status', run: () => exportOrders(api.orders.filter(o => o.day >= from), 'kiln-orders-month.csv') },
    { name: 'Customers', detail: 'Name, country, orders and spend this month', run: () => { const m = new Map<string, { n: number; s: number }>(); for (const o of api.orders) if (o.day >= from) { const x = m.get(o.customerId) ?? { n: 0, s: 0 }; x.n++; x.s += o.total; m.set(o.customerId, x) } csv('kiln-customers.csv', ['Customer', 'Country', 'Orders', 'Spent (EUR)'], [...m].map(([id, x]) => [customerById[id].name, customerById[id].country, String(x.n), x.s])) } },
    { name: 'Products', detail: 'Name, category, price, cost', run: () => csv('kiln-products.csv', ['Product', 'Category', 'Price (EUR)', 'Cost (EUR)'], PRODUCTS.map(p => [p.name, p.category, p.price, p.cost])) },
    { name: 'Profit and loss', detail: 'Last 8 months, every line', run: () => csv('kiln-pnl.csv', ['Month', 'Revenue', 'Cost of goods', 'Fees', 'Marketing', 'Payroll', 'Rent and software', 'Supplies', 'Profit'], api.pnl.map(m => [m.label, m.revenue, m.cogs, m.fees, m.marketing, m.payroll, m.rent, m.supplies, m.profit])) },
  ]
  return (
    <>
      <PageHead title="Exports" subtitle="Download CSV files for your accountant or a spreadsheet." />
      <Card>
        <ul className="list">{items.map(i => <li key={i.name}><IconTile icon={FileSpreadsheet} tone="inset" size={40} /><span className="list-text grow"><span className="t-body-medium">{i.name}</span><span className="t-caption c-secondary">{i.detail}</span></span><Button size="s" kind="secondary" icon={Download} onClick={i.run}>Download CSV</Button></li>)}</ul>
      </Card>
    </>
  )
}

