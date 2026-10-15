// Kiln & Co.'s money: operating costs, wallets in three currencies, company cards, supplier bills, VAT, and the
// monthly profit and loss. Costs are generated per day from a seed, like the orders.
import { addMonths, day, isWeekday, key, monthName, monthStart, parts, quarterOf, quarterStart, type Day } from './dates'
import { costOf, type Order } from './catalog'
import { between, pick, rng, round } from './rng'

export type CostKind = 'Payroll' | 'Rent & software' | 'Marketing' | 'Supplies'
export interface Cost { id: string; day: Day; name: string; amount: number; kind: CostKind; card?: CardId }
export type CardId = 'marketing' | 'operations'

export function dayCosts(d: Day): Cost[] {
  const r = rng(`costs:${key(d)}`)
  const dom = parts(d).d
  const out: Cost[] = []
  const add = (name: string, amount: number, kind: CostKind, card?: CardId) => out.push({ id: `${key(d)}:${out.length}`, day: d, name, amount: round(amount), kind, card })
  if (dom === 1) add('Studio rent', 1800, 'Rent & software')
  if (dom === 3) add('Store platform', 299, 'Rent & software', 'operations')
  if (dom === 10) add('Social Security', 2150, 'Payroll')
  if (dom === 25) add('Salaries', 9200, 'Payroll')
  if (dom === 8 || dom === 22) add('Social ads', between(r, 1100, 1900), 'Marketing', 'marketing')
  if (dom === 15) add('Search ads', between(r, 600, 1000), 'Marketing', 'marketing')
  if (isWeekday(d) && r() < 0.3) add(pick(r, ['Packing tape and tissue', 'Studio supplies', 'Courier pickup', 'Glaze samples']), between(r, 30, 260), 'Supplies', 'operations')
  return out
}

export function costs(from: Day, to: Day): Cost[] {
  const out: Cost[] = []
  for (let d = from; d <= to; d++) out.push(...dayCosts(d))
  return out
}

// ---------- wallets ----------
export type Currency = 'EUR' | 'USD' | 'GBP'
export const FX: Record<Currency, number> = { EUR: 1, USD: 0.926, GBP: 1.17 } // to EUR, fixed for the demo
export const SYMBOL: Record<Currency, string> = { EUR: '€', USD: '$', GBP: '£' }
export interface Wallet { currency: Currency; opening: number; limit: number; active: boolean }
export const WALLETS: Wallet[] = [
  { currency: 'EUR', opening: 148920.55, limit: 20000, active: true },
  { currency: 'USD', opening: 22678, limit: 10000, active: true },
  { currency: 'GBP', opening: 10240, limit: 7500, active: false },
]

// ---------- cards ----------
export interface Card { id: CardId; name: string; last4: string; exp: string; style: 'Ink' | 'Orange'; limit: number }
export const CARDS: Card[] = [
  { id: 'marketing', name: 'Marketing', last4: '6782', exp: '09/29', style: 'Ink', limit: 5000 },
  { id: 'operations', name: 'Operations', last4: '4356', exp: '03/28', style: 'Orange', limit: 3000 },
]
export const MONTHLY_CARD_LIMIT = 8000

// ---------- supplier bills ----------
export interface Bill { id: string; supplier: string; what: string; amount: number; issued: Day; due: Day }
const BILL_SPECS = [
  { issued: -35, terms: 30, supplier: 'Clayworks Supply', what: 'Stoneware clay, 600 kg', lo: 1800, hi: 2600 },
  { issued: -20, terms: 30, supplier: 'BoxCraft Packaging', what: 'Boxes and inserts', lo: 700, hi: 1100 },
  { issued: -8, terms: 30, supplier: 'Northline Logistics', what: 'Shipping labels, last month', lo: 2600, hi: 3600 },
  { issued: 2, terms: 14, supplier: 'Kiln Service Co.', what: 'Kiln element replacement', lo: 380, hi: 620 },
  { issued: 6, terms: 30, supplier: 'Glaze Lab', what: 'Glaze materials', lo: 420, hi: 780 },
]
export function bills(today: Day): Bill[] {
  const m = monthStart(today)
  const r = rng(`bills:${m}`)
  return BILL_SPECS.map((s, i) => ({ id: `${key(m)}-${i}`, supplier: s.supplier, what: s.what, amount: round(between(r, s.lo, s.hi), 10), issued: m + s.issued, due: m + s.issued + s.terms }))
    .filter(b => b.issued <= today)
}

// ---------- profit and loss ----------
export interface PnlMonth { label: string; from: Day; to: Day; revenue: number; cogs: number; fees: number; marketing: number; payroll: number; rent: number; supplies: number; costs: number; profit: number; orders: number }
const PAYMENT_FEE = 0.029
const LABEL_COST = 4.2

export function pnl(all: Order[], from: Day, to: Day, label = ''): PnlMonth {
  let revenue = 0, cogs = 0, fees = 0, n = 0
  for (const o of all) {
    if (o.day < from || o.day > to || o.status === 'refunded') continue
    revenue += o.total; cogs += costOf(o); fees += o.total * PAYMENT_FEE + LABEL_COST; n++
  }
  const c = costs(from, to)
  const sum = (k: CostKind) => c.filter(x => x.kind === k).reduce((a, x) => a + x.amount, 0)
  const marketing = sum('Marketing'), payroll = sum('Payroll'), rent = sum('Rent & software'), supplies = sum('Supplies')
  const total = cogs + fees + marketing + payroll + rent + supplies
  return { label, from, to, revenue: round(revenue), cogs: round(cogs), fees: round(fees), marketing: round(marketing), payroll: round(payroll), rent: round(rent), supplies: round(supplies), costs: round(total), profit: round(revenue - total), orders: n }
}

/** The last `count` months, oldest first; the last one is the current month to date. */
export function pnlMonths(all: Order[], today: Day, count = 8): PnlMonth[] {
  const out: PnlMonth[] = []
  for (let i = count - 1; i >= 0; i--) {
    const from = addMonths(monthStart(today), -i)
    const to = Math.min(addMonths(from, 1) - 1, today)
    out.push(pnl(all, from, to, monthName(from)))
  }
  return out
}

// ---------- VAT ----------
export const VAT_RATE = 0.23
/** Quarterly VAT is due on the 20th of the second month after the quarter ends. */
export function vatDue(all: Order[], today: Day) {
  const qs = quarterStart(today)
  let periodStart = addMonths(qs, -3)
  let due = day(parts(qs).y, parts(qs).m + 1, 20)
  if (today > due) { periodStart = qs; due = day(parts(qs).y, parts(qs).m + 4, 20) }
  const periodEnd = Math.min(addMonths(periodStart, 3) - 1, today)
  const p = pnl(all, periodStart, periodEnd)
  const output = round(p.revenue * VAT_RATE / (1 + VAT_RATE))
  const input = round((p.cogs + p.marketing + p.rent + p.supplies) * VAT_RATE / (1 + VAT_RATE))
  return { id: `${parts(periodStart).y}-Q${quarterOf(periodStart) + 1}`, period: `Q${quarterOf(periodStart) + 1} ${parts(periodStart).y}`, due, daysLeft: due - today, output, input, toPay: round(output - input), closed: periodEnd < today && addMonths(periodStart, 3) - 1 < today }
}
