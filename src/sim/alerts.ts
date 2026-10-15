// Things that need attention, computed from the current books. Each alert links to the page that resolves it.
import { abandonedCarts, returnRequests, stockLevels, type Order } from './catalog'
import type { Day } from './dates'
import { bills, vatDue } from './finance'
import { cardSpend, type EmberState } from './state'

export interface Alert { id: string; tone: 'warning' | 'negative' | 'info'; title: string; detail: string; to: string; action: string }

export function alerts(s: EmberState, all: Order[], today: Day, nowMinute: number): Alert[] {
  const out: Alert[] = []
  for (const x of stockLevels(all, today, s.restocks)) if (x.low) out.push({ id: `stock:${x.product.id}:${x.stock <= 0 ? 0 : 1}`, tone: x.stock <= 0 ? 'negative' : 'warning', title: x.stock <= 0 ? `${x.product.name} is sold out` : `${x.product.name} is running low`, detail: `${x.stock} in stock, reorder point ${x.reorder}`, to: '#/products/inventory', action: 'Restock' })
  const late = all.filter(o => (o.status === 'pending' || o.status === 'processing') && o.day < today - 1)
  if (late.length) out.push({ id: `late:${today}:${late.length}`, tone: 'warning', title: `${late.length} orders waiting more than a day`, detail: 'Ship them from Shipping', to: '#/orders/shipping', action: 'Ship' })
  const open = returnRequests(today, nowMinute).filter(r => !s.returns[r.id])
  if (open.length) out.push({ id: `returns:${today}:${open.length}`, tone: 'info', title: `${open.length} return requests to review`, detail: 'Approve a refund or decline', to: '#/orders/returns', action: 'Review' })
  const carts = abandonedCarts(today, nowMinute).filter(c => !s.reminded[c.id])
  if (carts.length >= 3) out.push({ id: `carts:${today}`, tone: 'info', title: `${carts.length} abandoned carts`, detail: 'Send a reminder email', to: '#/orders/carts', action: 'Remind' })
  const c = cardSpend(s, today)
  if (c.share >= 0.8) out.push({ id: `limit:${today}`, tone: c.share >= 1 ? 'negative' : 'warning', title: `Card spending at ${Math.round(c.share * 100)}% of the limit`, detail: 'Monthly limit for company cards', to: '#/finance/cards', action: 'Review' })
  for (const b of bills(today)) if (s.billsPaid[b.id] === undefined && b.due < today) out.push({ id: `bill:${b.id}`, tone: 'negative', title: `Bill overdue: ${b.supplier}`, detail: `${today - b.due} days late`, to: '#/finance/invoices', action: 'Pay' })
  const v = vatDue(all, today)
  if (s.vatPaid[v.id] === undefined && v.daysLeft <= 45) out.push({ id: `vat:${v.id}`, tone: v.daysLeft <= 7 ? 'negative' : 'info', title: `VAT ${v.period} due in ${v.daysLeft} days`, detail: 'Review and pay from Taxes', to: '#/finance/taxes', action: 'Open' })
  return out.filter(a => !s.dismissed[a.id])
}
