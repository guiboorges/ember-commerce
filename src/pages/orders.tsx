import { BellRing, Check, Clock, Download, Package, ShoppingBag, Truck, Undo2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { abandonedCarts, customerById, orderId, productById, returnRequests, type OrderStatus } from '../sim/catalog'
import { addMonths, key, monthStart, shortDate } from '../sim/dates'
import { between, rng } from '../sim/rng'
import type { EmberApi } from '../sim/useEmber'
import { exportOrders, Filters, OrdersTable, PageHead } from '../components/shared'
import { Avatar, Button, Card, Empty, eur, KpiTile, num, Status, trendOf } from '../components/ui'

type Filter = 'all' | OrderStatus
const STATUSES: OrderStatus[] = ['pending', 'processing', 'shipped', 'completed', 'refunded']
const cap = (s: string) => s[0].toUpperCase() + s.slice(1)

export function AllOrders({ api, onOpen }: { api: EmberApi; onOpen: (no: number) => void }) {
  const [filter, setFilter] = useState<Filter>('all')
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(12)
  const month = useMemo(() => api.orders.filter(o => o.day >= monthStart(api.today)).reverse(), [api.orders, api.today])
  const counts = Object.fromEntries(STATUSES.map(s => [s, month.filter(o => o.status === s).length])) as Record<OrderStatus, number>
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return month.filter(o => (filter === 'all' || o.status === filter) && (!s || `${orderId(o.no)} ${customerById[o.customerId].name}`.toLowerCase().includes(s)))
  }, [month, filter, q])
  const today = api.orders.filter(o => o.day === api.today).length
  const lastWeekSameDay = api.orders.filter(o => o.day === api.today - 7 && o.minute < api.nowMinute).length
  const waiting = api.orders.filter(o => o.status === 'pending' || o.status === 'processing')
  const awaiting = waiting.length
  const late = waiting.filter(o => o.day < api.today - 1).length
  // Fulfilment time is not in the order data; it is seeded per month like the rest of the history.
  const fulfil = Math.round(between(rng(`fulfil:${key(monthStart(api.today))}`), 1.3, 1.9) * 10) / 10, prevFulfil = Math.round(between(rng(`fulfil:${key(addMonths(monthStart(api.today), -1))}`), 1.3, 1.9) * 10) / 10
  const openReturns = returnRequests(api.today, api.nowMinute).filter(r => !api.state.returns[r.id]).length
  return (
    <>
      <PageHead title="All orders" subtitle={`${num(month.length)} orders this month · ${today} today. Select rows to ship or export them.`}>
        <Button kind="secondary" icon={Download} onClick={() => exportOrders(list, 'kiln-orders.csv')}>Export CSV</Button>
      </PageHead>
      <div className="kpi-row">
        <KpiTile label="Orders today" value={String(today)} delta={`${Math.abs(today - lastWeekSameDay)}`} trend={trendOf(today - lastWeekSameDay)} period="vs same time last week" icon={ShoppingBag} />
        <KpiTile label="Awaiting shipment" value={String(awaiting)} delta={late ? `${late} late` : 'none late'} trend={late ? 'up-bad' : 'down-good'} period="older than a day" icon={Package} />
        <KpiTile label="Open returns" value={String(openReturns)} delta="to review" trend={openReturns ? 'up-bad' : 'down-good'} period="last 14 days" icon={Undo2} />
        <KpiTile label="Avg. fulfilment" value={`${fulfil.toFixed(1)} days`} delta={fulfil === prevFulfil ? 'no change' : `${Math.abs(fulfil - prevFulfil).toFixed(1)} d`} trend={fulfil === prevFulfil ? 'flat' : trendOf(fulfil - prevFulfil, true)} period="vs last month" icon={Clock} />
      </div>
      <Card title="Orders" subtitle="Online store · this month" action={<label className="search"><span className="sr-only">Search orders</span><input type="search" value={q} onChange={e => { setQ(e.target.value); setShown(12) }} placeholder="Search orders" /></label>}>
        <Filters label="Filter by status" value={filter} onChange={v => { setFilter(v); setShown(12) }} options={[{ id: 'all', label: 'All', count: month.length }, ...STATUSES.map(s => ({ id: s, label: cap(s), count: counts[s] }))]} />
        <OrdersTable api={api} list={list.slice(0, shown)} onOpen={onOpen} />
        {list.length > shown && <Button kind="secondary" onClick={() => setShown(shown + 24)}>Show more ({list.length - shown} left)</Button>}
      </Card>
    </>
  )
}

export function Returns({ api }: { api: EmberApi }) {
  const list = returnRequests(api.today, api.nowMinute)
  return (
    <>
      <PageHead title="Returns" subtitle="Requests from the last two weeks. Approving refunds the order from the EUR wallet." />
      <Card>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Order</th><th>Customer</th><th>Reason</th><th className="num">Amount</th><th>Requested</th><th>Decision</th></tr></thead>
            <tbody>
              {list.map(r => {
                const o = api.orders.find(x => x.no === r.orderNo)!
                const c = customerById[o.customerId]
                const d = api.state.returns[r.id]
                return (
                  <tr key={r.id}>
                    <td>{orderId(r.orderNo)}</td>
                    <td><span className="cust"><Avatar initials={c.initials} /><span className="t-body-medium">{c.name}</span></span></td>
                    <td className="t-body">{r.reason}</td>
                    <td className="num t-numeric tnum">{eur(r.amount)}</td>
                    <td className="c-secondary">{shortDate(r.day)}</td>
                    <td>{d ? <Status status={d === 'approved' ? 'refunded' : 'completed'} label={d === 'approved' ? 'Refunded' : 'Declined'} /> : (
                      <span className="btn-row-inline">
                        <Button size="s" icon={Check} onClick={() => api.act({ type: 'return', id: r.id, no: r.orderNo, decision: 'approved' })}>Approve refund</Button>
                        <Button size="s" kind="ghost" icon={X} onClick={() => api.act({ type: 'return', id: r.id, no: r.orderNo, decision: 'declined' })}>Decline</Button>
                      </span>
                    )}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {!list.length && <Empty>No return requests.</Empty>}
        </div>
      </Card>
    </>
  )
}

export function Shipping({ api, onOpen }: { api: EmberApi; onOpen: (no: number) => void }) {
  const ready = api.orders.filter(o => o.status === 'pending' || o.status === 'processing').reverse()
  const transit = api.orders.filter(o => o.status === 'shipped').reverse().slice(0, 12)
  return (
    <>
      <PageHead title="Shipping" subtitle={`${ready.length} orders ready to ship · labels by Northline Logistics.`}>
        <Button icon={Truck} disabled={!ready.length} onClick={() => api.act({ type: 'ship', nos: ready.map(o => o.no) })}>Ship all {ready.length || ''}</Button>
      </PageHead>
      <Card title="Ready to ship" subtitle="Pending and processing">
        <OrdersTable api={api} list={ready} onOpen={onOpen} empty="Everything has shipped." extra={o => <Button size="s" kind="secondary" icon={Truck} onClick={() => api.act({ type: 'ship', nos: [o.no] })}>Ship</Button>} />
      </Card>
      <Card title="In transit" subtitle="Shipped, not yet delivered">
        <OrdersTable api={api} list={transit} selectable={false} onOpen={onOpen} empty="Nothing in transit." />
      </Card>
    </>
  )
}

export function Carts({ api }: { api: EmberApi }) {
  const list = abandonedCarts(api.today, api.nowMinute)
  const total = list.reduce((a, c) => a + c.value, 0)
  const ago = (at: number) => { const m = api.today * 1440 + api.nowMinute - at; return m < 60 ? `${m} min ago` : m < 1440 ? `${Math.round(m / 60)} h ago` : `${Math.round(m / 1440)} d ago` }
  return (
    <>
      <PageHead title="Abandoned carts" subtitle={`${list.length} carts worth ${eur(total)} in the last three days.`} />
      <Card>
        <ul className="list">
          {list.map(c => {
            const cu = customerById[c.customerId]
            const sent = api.state.reminded[c.id]
            return (
              <li key={c.id}>
                <Avatar initials={cu.initials} size={40} />
                <span className="list-text"><span className="t-body-medium">{cu.name}</span><span className="t-caption c-secondary">{c.lines.map(l => `${l.qty} × ${productById[l.productId].name}`).join(', ')} · {ago(c.at)}</span></span>
                <span className="t-numeric tnum">{eur(c.value)}</span>
                {sent ? <Status status="completed" label="Reminded" /> : <Button size="s" kind="secondary" icon={BellRing} onClick={() => api.act({ type: 'remindCart', id: c.id, customer: cu.name })}>Send reminder</Button>}
              </li>
            )
          })}
        </ul>
        {!list.length && <Empty>No abandoned carts.</Empty>}
      </Card>
    </>
  )
}

