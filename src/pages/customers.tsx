import { Crown, MessageSquare, Sparkles, TriangleAlert, Repeat } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CUSTOMERS, productById, reviews } from '../sim/catalog'
import { shortDate, type Day } from '../sim/dates'
import type { EmberApi } from '../sim/useEmber'
import { PageHead } from '../components/shared'
import { Avatar, Button, Card, eur, eur0, IconTile, LimitBar, num, Stars, Status } from '../components/ui'

type Segment = 'VIP' | 'Returning' | 'New' | 'At risk' | 'Occasional'
function useCustomers(api: EmberApi) {
  return useMemo(() => {
    const m = new Map<string, { orders: number; spent: number; first: Day; last: Day }>()
    for (const o of api.orders) {
      if (o.status === 'refunded') continue
      const x = m.get(o.customerId) ?? { orders: 0, spent: 0, first: o.day, last: o.day }
      x.orders++; x.spent += o.total; x.last = Math.max(x.last, o.day); x.first = Math.min(x.first, o.day)
      m.set(o.customerId, x)
    }
    const spends = [...m.values()].map(x => x.spent).sort((a, b) => b - a)
    const vip = spends[Math.max(0, Math.floor(spends.length * 0.05) - 1)] ?? Infinity
    return CUSTOMERS.filter(c => m.has(c.id)).map(c => {
      const x = m.get(c.id)!
      const segment: Segment = x.spent >= vip ? 'VIP' : api.today - x.first <= 30 ? 'New' : api.today - x.last > 45 ? 'At risk' : x.orders >= 3 ? 'Returning' : 'Occasional'
      return { ...c, ...x, segment }
    }).sort((a, b) => b.spent - a.spent)
  }, [api.orders, api.today])
}

export function AllCustomers({ api }: { api: EmberApi }) {
  const all = useCustomers(api)
  const [q, setQ] = useState('')
  const list = all.filter(c => !q.trim() || `${c.name} ${c.country}`.toLowerCase().includes(q.trim().toLowerCase()))
  return (
    <>
      <PageHead title="All customers" subtitle={`${num(all.length)} customers, sorted by lifetime spend.`} />
      <Card action={<label className="search"><span className="sr-only">Search customers</span><input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search customers" /></label>}>
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Customer</th><th>Country</th><th className="num">Orders</th><th className="num">Spent</th><th>Last order</th><th>Segment</th></tr></thead>
            <tbody>
              {list.slice(0, 50).map(c => (
                <tr key={c.id}>
                  <td><span className="cust"><Avatar initials={c.initials} /><span className="t-body-medium">{c.name}</span></span></td>
                  <td className="c-secondary">{c.country}</td>
                  <td className="num tnum">{num(c.orders)}</td>
                  <td className="num t-numeric tnum">{eur(c.spent)}</td>
                  <td className="c-secondary">{c.orders ? shortDate(c.last) : '—'}</td>
                  <td><Status status={c.segment === 'VIP' ? 'shipped' : c.segment === 'At risk' ? 'negative' : c.segment === 'New' ? 'info' : 'positive'} label={c.segment} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  )
}

const SEG: { id: Segment; icon: typeof Crown; text: string }[] = [
  { id: 'VIP', icon: Crown, text: 'The top 5% by lifetime spend' },
  { id: 'Returning', icon: Repeat, text: 'Three or more orders' },
  { id: 'New', icon: Sparkles, text: 'First order in the last 30 days' },
  { id: 'At risk', icon: TriangleAlert, text: 'No order in 45 days' },
]
export function Segments({ api }: { api: EmberApi }) {
  const all = useCustomers(api)
  const total = all.reduce((a, c) => a + c.spent, 0) || 1
  return (
    <>
      <PageHead title="Segments" subtitle="Groups update as customers order." />
      <div className="grid-2">
        {SEG.map(s => {
          const list = all.filter(c => c.segment === s.id)
          const spent = list.reduce((a, c) => a + c.spent, 0)
          return (
            <Card key={s.id} title={s.id} subtitle={s.text} action={<IconTile icon={s.icon} tone="accent" size={40} />}>
              <p className="t-display-kpi tnum">{list.length} <span className="t-body c-secondary">customers</span></p>
              <LimitBar value={spent / total} label={`${s.id} share of lifetime revenue`} />
              <p className="split t-caption c-secondary"><span>{Math.round((spent / total) * 100)}% of lifetime revenue</span><span>{eur0(spent)}</span></p>
              <div className="avatars">{list.slice(0, 6).map(c => <Avatar key={c.id} initials={c.initials} />)}{list.length > 6 && <span className="more t-label-small">+{list.length - 6}</span>}</div>
            </Card>
          )
        })}
      </div>
    </>
  )
}

export function Reviews({ api }: { api: EmberApi }) {
  const list = reviews(api.today)
  const avg = list.reduce((a, r) => a + r.stars, 0) / list.length
  const [draft, setDraft] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<string | null>(null)
  return (
    <>
      <PageHead title="Reviews" subtitle={`${list.length} recent reviews · average ${avg.toFixed(1)} out of 5.`} />
      <Card>
        <ul className="list reviews">
          {list.map(r => {
            const c = CUSTOMERS.find(x => x.id === r.customerId)!
            const reply = api.state.replies[r.id]
            return (
              <li key={r.id}>
                <Avatar initials={c.initials} size={40} />
                <span className="list-text grow">
                  <span className="split"><span className="t-body-medium">{c.name} <span className="c-secondary t-body">on {productById[r.productId].name}</span></span><Stars n={r.stars} /></span>
                  <span className="t-body">{r.text}</span>
                  <span className="t-caption c-secondary">{shortDate(r.day)}</span>
                  {reply && <span className="reply t-body"><strong>Kiln &amp; Co.:</strong> {reply}</span>}
                  {open === r.id && !reply && (
                    <form className="reply-form" onSubmit={e => { e.preventDefault(); const t = (draft[r.id] ?? '').trim(); if (t) { api.act({ type: 'reply', id: r.id, text: t }); setOpen(null) } }}>
                      <label className="field grow"><span className="sr-only">Reply to {c.name}</span><input autoFocus value={draft[r.id] ?? ''} onChange={e => setDraft({ ...draft, [r.id]: e.target.value })} placeholder="Write a public reply" /></label>
                      <Button size="s" type="submit">Post</Button>
                    </form>
                  )}
                </span>
                {!reply && open !== r.id && <Button size="s" kind="secondary" icon={MessageSquare} onClick={() => setOpen(r.id)}>Reply</Button>}
              </li>
            )
          })}
        </ul>
      </Card>
    </>
  )
}
