import { ArrowLeftRight, BellOff, ChevronDown, CreditCard, Download, ListFilter, Percent, Plus, Receipt, ShoppingBag, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { customerById, orderId } from '../sim/catalog'
import { alerts as computeAlerts } from '../sim/alerts'
import { SYMBOL } from '../sim/finance'
import { money } from '../sim/state'
import type { EmberApi } from '../sim/useEmber'
import { href } from '../nav'
import { MoneyDialog, OrdersTable, time } from '../components/shared'
import { Avatar, Button, Card, Delta, Empty, eur, eur0, IconTile, KpiTile, Legend, LimitBar, PaymentCard, pct, PnlChart, Status, trendOf, WalletCard } from '../components/ui'

const greeting = (h: number) => (h < 5 ? 'Good evening' : h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening')
const LIMIT_TEXT: Record<string, string> = { EUR: '€20k / month', USD: '$10k / month', GBP: '£7.5k / month' }

export function BalanceCard({ api }: { api: EmberApi }) {
  const [dlg, setDlg] = useState<null | 'transfer' | 'request'>(null)
  return (
    <section className="card balance" aria-labelledby="bal-title">
      <div className="card-header">
        <h2 className="t-body-medium c-secondary" id="bal-title">Total balance</h2>
        <span className="chip" title="All wallets converted to euros at fixed demo rates"><span className="symbol" aria-hidden="true">€</span>EUR<ChevronDown size={14} aria-hidden="true" /></span>
      </div>
      <div>
        <p className="t-display-balance tnum">{eur(api.totalEur)}</p>
        <p className="delta-row"><Delta trend={trendOf(api.balanceDelta)}>{pct(api.balanceDelta, 1)}</Delta><span className="t-caption c-secondary">vs last month</span></p>
      </div>
      <div className="btn-row">
        <Button icon={ArrowLeftRight} onClick={() => setDlg('transfer')}>Transfer</Button>
        <Button kind="secondary" icon={Download} onClick={() => setDlg('request')}>Request</Button>
      </div>
      <div className="well">
        <p className="t-label">Wallets <span className="c-secondary">· {api.wallets.length} currencies</span></p>
        <div className="wallets">
          {api.wallets.map(w => <WalletCard key={w.currency} symbol={SYMBOL[w.currency]} code={w.currency} amount={money(w.balance, w.currency)} limit={LIMIT_TEXT[w.currency]} active={w.active} />)}
        </div>
      </div>
      <MoneyDialog api={api} mode="transfer" open={dlg === 'transfer'} onClose={() => setDlg(null)} />
      <MoneyDialog api={api} mode="request" open={dlg === 'request'} onClose={() => setDlg(null)} />
    </section>
  )
}

export function KpiGrid({ api }: { api: EmberApi }) {
  const k = api.kpis
  return (
    <section className="card kpi-grid" aria-label="This month">
      <KpiTile hero label="Revenue" value={eur0(k.revenue)} delta={pct(k.revenueDelta)} trend={trendOf(k.revenueDelta)} period="This month" icon={Wallet} />
      <KpiTile label="Orders" value={k.orders.toLocaleString('en-IE')} delta={pct(k.ordersDelta)} trend={trendOf(k.ordersDelta)} period="This month" icon={ShoppingBag} />
      <KpiTile label="Avg. order value" value={eur(k.aov)} delta={pct(k.aovDelta)} trend={trendOf(k.aovDelta)} period="This month" icon={Receipt} />
      <KpiTile label="Conversion rate" value={`${(k.conversion * 100).toFixed(1)}%`} delta={`${Math.abs(k.conversionDelta * 100).toFixed(1)} pt`} trend={trendOf(k.conversionDelta)} period="This month" icon={Percent} />
    </section>
  )
}

export function PnlCard({ api, title = 'Total income' }: { api: EmberApi; title?: string }) {
  return (
    <Card title={title} subtitle="Revenue split into costs and profit, last 8 months" className="pnl-card">
      <div className="well">
        <div className="well-head"><span className="t-label">Profit and loss</span><Legend items={[{ label: 'Profit', series: 'accent' }, { label: 'Costs', series: 'neutral' }]} /></div>
        <PnlChart months={api.pnl} />
      </div>
    </Card>
  )
}

export function LimitCard({ api }: { api: EmberApi }) {
  const c = api.cards
  return (
    <Card title="Monthly spending limit" action={<span className="t-label c-secondary">{Math.round(c.share * 100)}% used</span>}>
      <LimitBar value={c.share} label="Company card spending this month" />
      <div className="split"><span><span className="t-numeric tnum">{eur(c.total)}</span> <span className="t-caption c-secondary">spent of</span></span><span className="t-numeric tnum">{eur(c.limit)}</span></div>
    </Card>
  )
}

export function CardsCard({ api }: { api: EmberApi }) {
  return (
    <section className="card cards-card" aria-labelledby="cc-title">
      <div className="card-header">
        <span className="cust"><IconTile icon={CreditCard} tone="inset" /><h2 className="t-h2" id="cc-title">Company cards</h2></span>
        <a className="btn" data-kind="secondary" data-size="s" href={href('finance', 'cards')}><Plus size={16} aria-hidden="true" />Manage</a>
      </div>
      <div className="pay-row">{api.cards.cards.map(c => <PaymentCard key={c.id} style={c.style} last4={c.last4} exp={c.exp} frozen={c.frozen} />)}</div>
    </section>
  )
}

export function Dashboard({ api, onOpen }: { api: EmberApi; onOpen: (no: number) => void }) {
  const [q, setQ] = useState('')
  const recent = useMemo(() => {
    const s = q.trim().toLowerCase()
    const last = api.orders.slice(-200).reverse()
    return (s ? last.filter(o => `${orderId(o.no)} ${customerById[o.customerId].name}`.toLowerCase().includes(s)) : last).slice(0, 5)
  }, [api.orders, q])
  return (
    <>
      <div className="page-head"><div><h1 className="t-display-greeting">{greeting(api.now.getHours())}, Guilherme</h1><p className="t-body c-secondary">Here is how Kiln &amp; Co. is doing today: sales, money, and orders in one place.</p></div></div>
      <div className="row row-1"><BalanceCard api={api} /><KpiGrid api={api} /></div>
      <div className="row row-2"><PnlCard api={api} /><div className="col"><LimitCard api={api} /><CardsCard api={api} /></div></div>
      <Card title="Recent orders" subtitle={`Online store · ${api.orders.filter(o => o.day === api.today).length} today`} action={
        <>
          <label className="search"><span className="sr-only">Search orders</span><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search orders" /></label>
          <a className="btn" data-kind="ghost" data-outline href={href('orders')}><ListFilter size={18} aria-hidden="true" />All orders</a>
        </>
      }>
        <OrdersTable api={api} list={recent} onOpen={onOpen} empty={`No recent order matches “${q}”.`} />
      </Card>
    </>
  )
}

export function ActivityPage({ api, onOpen }: { api: EmberApi; onOpen: (no: number) => void }) {
  const ago = (ms: number) => { const m = Math.round((api.now.getTime() - ms) / 60000); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago` }
  const latest = api.orders.slice(-12).reverse()
  return (
    <>
      <div className="page-head"><div><h1 className="t-display-greeting">Activity</h1><p className="t-body c-secondary">What happened in the store and the books, newest first.</p></div></div>
      <div className="row row-even">
        <Card title="Your actions and system events">
          <ul className="feed">
            {api.state.events.map(e => <li key={e.id}><span className="status-dot" data-tone={e.tone} aria-hidden="true" /><span className="t-body-medium">{e.text}</span><span className="t-caption c-secondary">{e.detail ? `${e.detail} · ` : ''}{ago(e.at)}</span></li>)}
          </ul>
        </Card>
        <Card title="New orders" subtitle="Live: orders appear as customers place them">
          <ul className="feed">
            {latest.map(o => (
              <li key={o.no}><Avatar initials={customerById[o.customerId].initials} /><button type="button" className="link t-body-medium" onClick={() => onOpen(o.no)}>{orderId(o.no)} from {customerById[o.customerId].name}</button><span className="t-caption c-secondary">{eur(o.total)} · {time(o)} · <Status status={o.status} /></span></li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  )
}

export function AlertsPage({ api }: { api: EmberApi }) {
  const list = computeAlerts(api.state, api.orders, api.today, api.nowMinute)
  return (
    <>
      <div className="page-head"><div><h1 className="t-display-greeting">Alerts</h1><p className="t-body c-secondary">{list.length ? `${list.length} things need your attention.` : 'Nothing needs your attention right now.'}</p></div></div>
      <Card>
        {list.length ? (
          <ul className="alert-list">
            {list.map(a => (
              <li key={a.id} data-tone={a.tone}>
                <Status status={a.tone === 'negative' ? 'negative' : a.tone === 'warning' ? 'warning' : 'info'} label={a.tone === 'negative' ? 'Urgent' : a.tone === 'warning' ? 'Soon' : 'To do'} />
                <span className="alert-text"><span className="t-body-medium">{a.title}</span><span className="t-caption c-secondary">{a.detail}</span></span>
                <a className="btn" data-kind="secondary" data-size="s" href={a.to}>{a.action}</a>
                <Button kind="ghost" size="s" icon={BellOff} onClick={() => api.act({ type: 'dismiss', id: a.id })} aria-label={`Dismiss: ${a.title}`}>Dismiss</Button>
              </li>
            ))}
          </ul>
        ) : <Empty>You are all caught up.</Empty>}
      </Card>
    </>
  )
}
