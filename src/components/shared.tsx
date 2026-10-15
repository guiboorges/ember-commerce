import { Download, MoreHorizontal, Send, Truck, Undo2 } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'
import { customerById, itemsIn, orderId, productById, type Order } from '../sim/catalog'
import { shortDate } from '../sim/dates'
import { SYMBOL, WALLETS, type Currency } from '../sim/finance'
import { money } from '../sim/state'
import type { EmberApi } from '../sim/useEmber'
import { Avatar, Button, Checkbox, Dialog, Empty, eur, IconButton, Status, STROKE } from './ui'

export const time = (o: Order) => `${shortDate(o.day)}, ${String(Math.floor(o.minute / 60)).padStart(2, '0')}:${String(o.minute % 60).padStart(2, '0')}`

export function csv(name: string, header: string[], rows: (string | number)[][]) {
  const esc = (v: string | number) => (typeof v === 'number' ? v.toFixed(2) : `"${v.replace(/"/g, '""')}"`)
  const body = [header.join(','), ...rows.map(r => r.map(esc).join(','))].join('\n')
  const url = URL.createObjectURL(new Blob([body], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export const exportOrders = (list: Order[], name = 'kiln-orders.csv') =>
  csv(name, ['Order', 'Date', 'Customer', 'Items', 'Total (EUR)', 'Status'], list.map(o => [orderId(o.no), time(o), customerById[o.customerId].name, String(itemsIn(o)), o.total, o.status]))

export function OrdersTable({ api, list, selectable = true, onOpen, empty = 'No orders match.', extra }: {
  api: EmberApi; list: Order[]; selectable?: boolean; onOpen: (no: number) => void; empty?: string; extra?: (o: Order) => ReactNode
}) {
  const [sel, setSel] = useState<Set<number>>(new Set())
  const visible = new Set(list.map(o => o.no))
  const picked = [...sel].filter(n => visible.has(n))
  const all = list.length > 0 && picked.length === list.length
  const toggle = (no: number, on: boolean) => setSel(prev => { const n = new Set(prev); if (on) n.add(no); else n.delete(no); return n })
  const shippable = list.filter(o => picked.includes(o.no) && (o.status === 'pending' || o.status === 'processing'))
  return (
    <div className="table-wrap">
      {selectable && picked.length > 0 && (
        <div className="bulk" role="region" aria-label="Selected orders">
          <span className="t-label">{picked.length} selected</span>
          <Button kind="primary" size="s" icon={Truck} disabled={!shippable.length} onClick={() => { api.act({ type: 'ship', nos: shippable.map(o => o.no) }); setSel(new Set()) }}>Mark shipped{shippable.length ? ` (${shippable.length})` : ''}</Button>
          <Button kind="secondary" size="s" icon={Download} onClick={() => exportOrders(list.filter(o => picked.includes(o.no)), 'kiln-selected-orders.csv')}>Export</Button>
          <Button kind="ghost" size="s" onClick={() => setSel(new Set())}>Clear</Button>
        </div>
      )}
      <table className="table">
        <thead>
          <tr>
            {selectable && <th className="col-check"><Checkbox checked={all ? true : picked.length ? 'mixed' : false} onChange={v => setSel(v ? new Set(list.map(o => o.no)) : new Set())} label="Select all orders" /></th>}
            <th>Order</th><th>Customer</th><th className="num">Amount</th><th>Status</th><th>Date</th>{extra && <th><span className="sr-only">Action</span></th>}<th className="col-menu"><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody>
          {list.map(o => {
            const c = customerById[o.customerId]
            const on = picked.includes(o.no)
            return (
              <tr key={o.no} data-selected={on || undefined}>
                {selectable && <td className="col-check"><Checkbox checked={on} onChange={v => toggle(o.no, v)} label={`Select ${orderId(o.no)}`} /></td>}
                <td className="t-body">{orderId(o.no)}</td>
                <td><span className="cust"><Avatar initials={c.initials} /><span className="t-body-medium truncate">{c.name}</span></span></td>
                <td className="num t-numeric tnum">{eur(o.total)}</td>
                <td><Status status={o.status} /></td>
                <td className="t-body c-secondary nowrap">{time(o)}</td>
                {extra && <td>{extra(o)}</td>}
                <td className="col-menu"><IconButton icon={MoreHorizontal} label={`Open ${orderId(o.no)}`} onClick={() => onOpen(o.no)} /></td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {!list.length && <Empty>{empty}</Empty>}
    </div>
  )
}

export function OrderDialog({ api, no, onClose }: { api: EmberApi; no: number | null; onClose: () => void }) {
  const o = useMemo(() => api.orders.find(x => x.no === no), [api.orders, no])
  return (
    <Dialog open={no !== null && !!o} onClose={onClose} title={o ? orderId(o.no) : 'Order'}>
      {o && (
        <div className="stack-16">
          <div className="detail-head">
            <span className="cust"><Avatar initials={customerById[o.customerId].initials} size={40} /><span><span className="t-h3 block">{customerById[o.customerId].name}</span><span className="t-caption c-secondary">{customerById[o.customerId].country} · {time(o)}</span></span></span>
            <Status status={o.status} />
          </div>
          <ul className="lines">
            {o.lines.map(l => <li key={l.productId}><span className="t-body">{l.qty} × {productById[l.productId].name}</span><span className="t-numeric tnum">{eur(l.qty * l.price)}</span></li>)}
            <li className="c-secondary"><span className="t-body">Shipping</span><span className="t-numeric tnum">{o.shipping ? eur(o.shipping) : 'Free'}</span></li>
            <li className="total"><span className="t-body-strong">Total</span><span className="t-numeric tnum">{eur(o.total)}</span></li>
          </ul>
          <div className="form-actions">
            {(o.status === 'pending' || o.status === 'processing') && <Button icon={Truck} onClick={() => api.act({ type: 'ship', nos: [o.no] })}>Mark shipped</Button>}
            {o.status !== 'refunded' && <Button kind="secondary" icon={Undo2} onClick={() => api.act({ type: 'refund', no: o.no })}>Refund {eur(o.total)}</Button>}
            {o.status === 'refunded' && <p className="t-body c-secondary">Refunded to the customer from the EUR wallet.</p>}
          </div>
        </div>
      )}
    </Dialog>
  )
}

export function MoneyDialog({ api, mode, open, onClose }: { api: EmberApi; mode: 'transfer' | 'request'; open: boolean; onClose: () => void }) {
  const [currency, setCurrency] = useState<Currency>('EUR')
  const [who, setWho] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const w = api.wallets.find(x => x.currency === currency)!
  const submit = () => {
    const v = Number(amount.replace(',', '.'))
    if (!who.trim()) return setError(mode === 'transfer' ? 'Enter who you are paying.' : 'Enter who should pay you.')
    if (!(v > 0)) return setError('Enter an amount above zero.')
    if (mode === 'transfer' && !w.active) return setError(`The ${currency} wallet is paused.`)
    if (mode === 'transfer' && v > w.balance) return setError(`That is more than the ${currency} balance (${money(w.balance, currency)}).`)
    api.act(mode === 'transfer' ? { type: 'transfer', currency, to: who.trim(), amount: v, note } : { type: 'request', currency, from: who.trim(), amount: v, note })
    setWho(''); setAmount(''); setNote(''); setError('')
    onClose()
  }
  return (
    <Dialog open={open} onClose={() => { setError(''); onClose() }} title={mode === 'transfer' ? 'New transfer' : 'Request payment'}>
      <form className="form" onSubmit={e => { e.preventDefault(); submit() }} noValidate>
        <label className="field"><span className="t-label">{mode === 'transfer' ? 'From wallet' : 'Into wallet'}</span>
          <select value={currency} onChange={e => setCurrency(e.target.value as Currency)}>
            {WALLETS.map(x => <option key={x.currency} value={x.currency}>{x.currency} · {money(api.wallets.find(y => y.currency === x.currency)!.balance, x.currency)}{x.active ? '' : ' · paused'}</option>)}
          </select>
        </label>
        <label className="field"><span className="t-label">{mode === 'transfer' ? 'Pay to' : 'Request from'}</span><input value={who} onChange={e => setWho(e.target.value)} placeholder={mode === 'transfer' ? 'e.g. Clayworks Supply' : 'e.g. Atlas Studio'} /></label>
        <label className="field"><span className="t-label">Amount ({SYMBOL[currency]})</span><input inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" /></label>
        <label className="field"><span className="t-label">Note (optional)</span><input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Invoice 2041" /></label>
        {error && <p className="form-error t-label" role="alert">{error}</p>}
        <div className="form-actions"><Button kind="ghost" onClick={onClose}>Cancel</Button><Button type="submit" icon={Send}>{mode === 'transfer' ? 'Send transfer' : 'Send request'}</Button></div>
      </form>
    </Dialog>
  )
}

export function PageHead({ title, subtitle, children }: { title: string; subtitle: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div><h1 className="t-display-greeting">{title}</h1><p className="t-body c-secondary">{subtitle}</p></div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  )
}

export function Filters<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { id: T; label: string; count?: number }[]; label: string }) {
  return (
    <div className="filters" role="radiogroup" aria-label={label}>
      {options.map(o => <button key={o.id} type="button" role="radio" aria-checked={value === o.id} className="filter" onClick={() => onChange(o.id)}>{o.label}{o.count !== undefined && <span className="filter-count tnum">{o.count}</span>}</button>)}
    </div>
  )
}

export const ICON = { stroke: STROKE }
