// Everything the demo lets you change, as pure functions: ship and refund orders, handle returns, restock,
// toggle discounts and cards, move money, pay bills and VAT. useEmber.ts owns the state, the clock, and storage.
import { addMonths, monthStart, shortDate, type Day } from './dates'
import { customerById, DISCOUNTS, orderId, orders, type Order, type OrderStatus } from './catalog'
import { CARDS, costs, FX, MONTHLY_CARD_LIMIT, pnl, SYMBOL, WALLETS, type CardId, type Currency } from './finance'
import { between, rng, round } from './rng'

export interface Transfer { id: string; at: number; day: Day; kind: 'out' | 'request' | 'refund' | 'bill' | 'vat'; currency: Currency; amount: number; counterparty: string; note: string }
export interface EmberEvent { id: number; at: number; text: string; detail?: string; tone?: 'positive' | 'negative' | 'warning' | 'neutral' }

export interface EmberState {
  statuses: Record<number, OrderStatus>
  returns: Record<string, 'approved' | 'declined'>
  reminded: Record<string, number>
  restocks: Record<string, number>
  discounts: Record<string, boolean>
  frozen: Partial<Record<CardId, boolean>>
  transfers: Transfer[]
  billsPaid: Record<string, Day>
  vatPaid: Record<string, Day>
  replies: Record<string, string>
  dismissed: Record<string, true>
  events: EmberEvent[]
  unread: number
}

export function freshState(now: number): EmberState {
  return {
    statuses: {}, returns: {}, reminded: {}, restocks: {}, discounts: {}, frozen: {}, transfers: [], billsPaid: {}, vatPaid: {}, replies: {}, dismissed: {},
    events: [
      { id: 3, at: now - 6 * 60_000, text: 'Payout received', detail: 'Card payments · EUR wallet', tone: 'positive' },
      { id: 2, at: now - 45 * 60_000, text: 'Stock running low', detail: 'Check Inventory', tone: 'warning' },
      { id: 1, at: now - 3 * 3600_000, text: 'Discount AUTUMN15 is live', detail: 'Tableware, until Nov 30', tone: 'neutral' },
    ],
    unread: 2,
  }
}

// ---------- selectors ----------
export function allOrders(s: EmberState, today: Day, nowMinute: number): Order[] {
  const list = orders(today, nowMinute)
  if (!Object.keys(s.statuses).length) return list
  return list.map(o => (s.statuses[o.no] ? { ...o, status: s.statuses[o.no] } : o))
}

export function walletBalances(s: EmberState) {
  return WALLETS.map(w => {
    const out = s.transfers.filter(t => t.currency === w.currency && t.kind !== 'request').reduce((a, t) => a + t.amount, 0)
    return { ...w, balance: round(w.opening - out) }
  })
}
export const toEur = (amount: number, c: Currency) => round(amount * FX[c])
export const money = (amount: number, c: Currency) => `${SYMBOL[c]}${amount.toLocaleString('en-IE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Visitors per day, for the conversion rate. */
export const sessions = (d: Day) => Math.round(between(rng(`sessions:${d}`), 950, 1150))

const sumOrders = (all: Order[], from: Day, to: Day) => {
  let revenue = 0, count = 0
  for (const o of all) if (o.day >= from && o.day <= to && o.status !== 'refunded') { revenue += o.total; count++ }
  return { revenue: round(revenue), count }
}

/** Month to date, compared with the same days of last month. */
export function storeKpis(all: Order[], today: Day) {
  const from = monthStart(today)
  const prevFrom = addMonths(from, -1)
  const prevTo = Math.min(prevFrom + (today - from), from - 1)
  const cur = sumOrders(all, from, today), prev = sumOrders(all, prevFrom, prevTo)
  let sess = 0, prevSess = 0
  for (let d = from; d <= today; d++) sess += sessions(d)
  for (let d = prevFrom; d <= prevTo; d++) prevSess += sessions(d)
  const aov = cur.count ? cur.revenue / cur.count : 0, prevAov = prev.count ? prev.revenue / prev.count : 0
  const conv = sess ? cur.count / sess : 0, prevConv = prevSess ? prev.count / prevSess : 0
  const ch = (a: number, b: number) => (b ? (a - b) / b : 0)
  return {
    revenue: cur.revenue, orders: cur.count, aov: round(aov), conversion: conv,
    revenueDelta: ch(cur.revenue, prev.revenue), ordersDelta: ch(cur.count, prev.count), aovDelta: ch(aov, prevAov), conversionDelta: conv - prevConv,
  }
}

export function cardSpend(s: EmberState, today: Day) {
  const month = costs(monthStart(today), today).filter(c => c.card)
  const by = CARDS.map(c => ({ ...c, frozen: !!s.frozen[c.id], spent: round(month.filter(x => x.card === c.id).reduce((a, x) => a + x.amount, 0)) }))
  const total = round(by.reduce((a, c) => a + c.spent, 0))
  return { cards: by, total, limit: MONTHLY_CARD_LIMIT, share: total / MONTHLY_CARD_LIMIT, items: month }
}

export function balanceChange(all: Order[], today: Day, totalEur: number) {
  const p = pnl(all, today - 30, today)
  return totalEur - p.profit > 0 ? p.profit / (totalEur - p.profit) : 0
}

export const isDiscountActive = (s: EmberState, code: string) => s.discounts[code] ?? DISCOUNTS.find(d => d.code === code)?.active ?? false

// ---------- actions ----------
export type Action =
  | { type: 'ship'; nos: number[] }
  | { type: 'refund'; no: number }
  | { type: 'return'; id: string; no: number; decision: 'approved' | 'declined' }
  | { type: 'remindCart'; id: string; customer: string }
  | { type: 'restock'; productId: string; name: string; qty: number }
  | { type: 'discount'; code: string; on: boolean }
  | { type: 'freeze'; card: CardId; on: boolean }
  | { type: 'transfer'; currency: Currency; to: string; amount: number; note: string }
  | { type: 'request'; currency: Currency; from: string; amount: number; note: string }
  | { type: 'payBill'; id: string; supplier: string; amount: number }
  | { type: 'payVat'; id: string; period: string; amount: number }
  | { type: 'reply'; id: string; text: string }
  | { type: 'dismiss'; id: string }
  | { type: 'read' }
  | { type: 'reset' }

export interface Ctx { today: Day; now: number; nowMinute: number }

function log(s: EmberState, now: number, text: string, detail?: string, tone: EmberEvent['tone'] = 'neutral'): EmberState {
  const ev = { id: (s.events[0]?.id ?? 0) + 1, at: now, text, detail, tone }
  return { ...s, events: [ev, ...s.events].slice(0, 50), unread: s.unread + 1 }
}
const transfer = (s: EmberState, c: Ctx, t: Omit<Transfer, 'id' | 'at' | 'day'>): EmberState =>
  ({ ...s, transfers: [{ ...t, id: `t${c.now}-${s.transfers.length}`, at: c.now, day: c.today }, ...s.transfers] })
const eur = (v: number) => money(v, 'EUR')

export function reduce(s: EmberState, a: Action, c: Ctx): EmberState {
  switch (a.type) {
    case 'ship': {
      const list = allOrders(s, c.today, c.nowMinute).filter(o => a.nos.includes(o.no) && (o.status === 'pending' || o.status === 'processing'))
      if (!list.length) return s
      const statuses = { ...s.statuses }
      for (const o of list) statuses[o.no] = 'shipped'
      return log({ ...s, statuses }, c.now, list.length === 1 ? `${orderId(list[0].no)} shipped` : `${list.length} orders shipped`, 'Labels printed, Northline Logistics', 'positive')
    }
    case 'refund': {
      const o = allOrders(s, c.today, c.nowMinute).find(x => x.no === a.no)
      if (!o || o.status === 'refunded') return s
      const next = transfer({ ...s, statuses: { ...s.statuses, [o.no]: 'refunded' } }, c, { kind: 'refund', currency: 'EUR', amount: o.total, counterparty: customerById[o.customerId].name, note: `Refund ${orderId(o.no)}` })
      return log(next, c.now, `${orderId(o.no)} refunded`, `${eur(o.total)} to ${customerById[o.customerId].name}`, 'warning')
    }
    case 'return': {
      if (s.returns[a.id]) return s
      let next: EmberState = { ...s, returns: { ...s.returns, [a.id]: a.decision } }
      if (a.decision === 'approved') return reduce(next, { type: 'refund', no: a.no }, c)
      next = log(next, c.now, `Return declined for ${orderId(a.no)}`, 'The customer was notified')
      return next
    }
    case 'remindCart':
      return log({ ...s, reminded: { ...s.reminded, [a.id]: c.now } }, c.now, `Reminder sent to ${a.customer}`, 'Abandoned cart email')
    case 'restock':
      return log({ ...s, restocks: { ...s.restocks, [a.productId]: (s.restocks[a.productId] ?? 0) + a.qty } }, c.now, `${a.name} restocked`, `+${a.qty} units`, 'positive')
    case 'discount':
      return log({ ...s, discounts: { ...s.discounts, [a.code]: a.on } }, c.now, `Discount ${a.code} ${a.on ? 'turned on' : 'paused'}`)
    case 'freeze': {
      const card = CARDS.find(x => x.id === a.card)!
      return log({ ...s, frozen: { ...s.frozen, [a.card]: a.on } }, c.now, `${card.name} card ${a.on ? 'frozen' : 'unfrozen'}`, `•••• ${card.last4}`, a.on ? 'warning' : 'neutral')
    }
    case 'transfer': {
      const w = walletBalances(s).find(x => x.currency === a.currency)!
      if (!w.active || a.amount <= 0 || a.amount > w.balance) return s
      return log(transfer(s, c, { kind: 'out', currency: a.currency, amount: round(a.amount), counterparty: a.to, note: a.note }), c.now, `Transfer sent to ${a.to}`, money(a.amount, a.currency), 'positive')
    }
    case 'request':
      if (a.amount <= 0) return s
      return log(transfer(s, c, { kind: 'request', currency: a.currency, amount: round(a.amount), counterparty: a.from, note: a.note }), c.now, `Payment requested from ${a.from}`, money(a.amount, a.currency))
    case 'payBill':
      if (s.billsPaid[a.id] !== undefined) return s
      return log(transfer({ ...s, billsPaid: { ...s.billsPaid, [a.id]: c.today } }, c, { kind: 'bill', currency: 'EUR', amount: a.amount, counterparty: a.supplier, note: 'Supplier bill' }), c.now, `Bill paid: ${a.supplier}`, eur(a.amount), 'positive')
    case 'payVat':
      if (s.vatPaid[a.id] !== undefined) return s
      return log(transfer({ ...s, vatPaid: { ...s.vatPaid, [a.id]: c.today } }, c, { kind: 'vat', currency: 'EUR', amount: a.amount, counterparty: 'Tax authority', note: `VAT ${a.period}` }), c.now, `VAT ${a.period} paid`, eur(a.amount), 'positive')
    case 'reply':
      return log({ ...s, replies: { ...s.replies, [a.id]: a.text } }, c.now, 'Reply posted', `“${a.text.slice(0, 40)}${a.text.length > 40 ? '…' : ''}”`)
    case 'dismiss':
      return { ...s, dismissed: { ...s.dismissed, [a.id]: true } }
    case 'read':
      return { ...s, unread: 0 }
    case 'reset':
      return freshState(c.now)
  }
}

export const dueLabel = (due: Day, today: Day) => (due < today ? `${today - due} days overdue` : due === today ? 'Due today' : `Due ${shortDate(due)}`)
