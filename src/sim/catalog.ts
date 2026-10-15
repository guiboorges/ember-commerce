// Kiln & Co., a small online store for ceramics and homeware. Products and customers are fixed; orders, carts,
// returns, and reviews are generated from a seed made of the date, so the history is the same on every reload.
// Today's orders appear as the day goes on: only orders placed before the current minute exist.
import { day, isWeekday, key, parts, type Day } from './dates'
import { between, pick, rng, round } from './rng'

export type Category = 'Tableware' | 'Drinkware' | 'Home' | 'Gifts'
export const CATEGORIES: Category[] = ['Tableware', 'Drinkware', 'Home', 'Gifts']

// target: units the shop expects to sell in a month; stock starts each month at 0.9–1.5× that.
export interface Product { id: string; name: string; category: Category; price: number; cost: number; target: number; weight: number }
export const PRODUCTS: Product[] = [
  { id: 'mug', name: 'Speckled mug', category: 'Drinkware', price: 24, cost: 8.4, target: 240, weight: 9 },
  { id: 'cups', name: 'Espresso cups, pair', category: 'Drinkware', price: 30, cost: 10.5, target: 130, weight: 5 },
  { id: 'teabowl', name: 'Tea bowl', category: 'Drinkware', price: 26, cost: 9.1, target: 105, weight: 4 },
  { id: 'pourover', name: 'Pour-over set', category: 'Drinkware', price: 58, cost: 21, target: 80, weight: 3 },
  { id: 'bowl', name: 'Stoneware bowl', category: 'Tableware', price: 32, cost: 11.2, target: 210, weight: 8 },
  { id: 'plate', name: 'Dinner plate', category: 'Tableware', price: 29, cost: 10.1, target: 185, weight: 7 },
  { id: 'platter', name: 'Serving platter', category: 'Tableware', price: 64, cost: 23, target: 80, weight: 3 },
  { id: 'napkins', name: 'Linen napkins, set of 4', category: 'Tableware', price: 28, cost: 9.8, target: 105, weight: 4 },
  { id: 'vase', name: 'Bud vase', category: 'Home', price: 22, cost: 7.7, target: 160, weight: 6 },
  { id: 'planter', name: 'Planter, medium', category: 'Home', price: 42, cost: 14.7, target: 105, weight: 4 },
  { id: 'candle', name: 'Candle in clay', category: 'Home', price: 34, cost: 11.9, target: 130, weight: 5 },
  { id: 'gift', name: 'Gift card', category: 'Gifts', price: 50, cost: 0, target: 999, weight: 2 },
]
export const productById = Object.fromEntries(PRODUCTS.map(p => [p.id, p])) as Record<string, Product>

const FIRST = ['Lena', 'Tomás', 'Amara', 'Noah', 'Yuki', 'Inês', 'Leo', 'Sara', 'Omar', 'Clara', 'Mateo', 'Freya', 'Jonas', 'Aisha', 'Hugo', 'Elif', 'Theo', 'Maya', 'Rui', 'Nora', 'Felix', 'Zoe', 'Ivan', 'Lucía', 'Owen', 'Mira', 'Kai', 'Alma', 'Ben', 'Sofia']
const LAST = ['Fischer', 'Ribeiro', 'Osei', 'Bennett', 'Tanaka', 'Prado', 'Brandt', 'Nilsson', 'Haddad', 'Moreau', 'Silva', 'Larsen', 'Weber', 'Khan', 'Dubois', 'Yilmaz', 'Hughes', 'Patel', 'Costa', 'Berg']
const COUNTRIES = ['Portugal', 'Germany', 'France', 'United Kingdom', 'Spain', 'Netherlands', 'Sweden', 'United States']

export interface Customer { id: string; name: string; initials: string; country: string }
export const CUSTOMERS: Customer[] = (() => {
  const r = rng('customers')
  const out: Customer[] = []
  const used = new Set<string>()
  while (out.length < 600) {
    const name = `${pick(r, FIRST)} ${pick(r, LAST)}`
    if (used.has(name)) continue
    used.add(name)
    out.push({ id: `c${out.length + 1}`, name, initials: name.split(' ').map(w => w[0]).join(''), country: pick(r, COUNTRIES) })
  }
  return out
})()
export const customerById = Object.fromEntries(CUSTOMERS.map(c => [c.id, c])) as Record<string, Customer>

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'completed' | 'refunded'
export interface Line { productId: string; qty: number; price: number }
export interface Order { no: number; day: Day; minute: number; customerId: string; lines: Line[]; subtotal: number; shipping: number; total: number; status: OrderStatus }
export const orderId = (no: number) => `#KC-${no}`

const SHIPPING = 4.9
const FREE_SHIPPING_FROM = 60
// Store traffic grows about 15% a year and peaks before Christmas.
const season = (d: Day) => [0.85, 0.8, 0.9, 0.95, 1, 0.95, 0.9, 0.9, 1, 1.05, 1.2, 1.45][parts(d).m]

/** Orders placed on day `d`, before `untilMinute` when it is today. */
export function dayOrders(d: Day, today: Day, firstNo: number, untilMinute = 24 * 60): Order[] {
  const r = rng(`orders:${key(d)}`)
  const growth = Math.max(0.6, 1 - 0.15 * ((today - d) / 365))
  const n = Math.round((isWeekday(d) ? 33 : 26) * season(d) * growth * between(r, 0.8, 1.2))
  const minutes = Array.from({ length: n }, () => Math.floor(between(r, 7 * 60, 23.5 * 60))).sort((a, b) => a - b)
  const age = today - d
  const out: Order[] = []
  minutes.forEach((minute, i) => {
    const lines: Line[] = []
    const count = r() < 0.55 ? 1 : r() < 0.75 ? 2 : 3
    for (let k = 0; k < count; k++) {
      let x = r() * PRODUCTS.reduce((a, p) => a + p.weight, 0)
      const p = PRODUCTS.find(q => (x -= q.weight) < 0) ?? PRODUCTS[0]
      const qty = r() < 0.8 ? 1 : 2
      const existing = lines.find(l => l.productId === p.id)
      if (existing) existing.qty += qty
      else lines.push({ productId: p.id, qty, price: p.price })
    }
    const subtotal = round(lines.reduce((a, l) => a + l.qty * l.price, 0))
    const shipping = subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING
    // 80 regulars place 30% of orders; the rest come from a customer base that grows from 200 to 600 over the history.
    const pool = Math.min(CUSTOMERS.length, Math.round(200 + 400 * (1 - (today - d) / HISTORY_DAYS)))
    const customerId = r() < 0.3 ? `c${1 + Math.floor(r() * 80)}` : `c${1 + Math.floor(r() * pool)}`
    const s = r()
    const status: OrderStatus =
      age === 0 ? (s < 0.45 ? 'pending' : 'processing')
        : age === 1 ? (s < 0.35 ? 'processing' : 'shipped')
          : age <= 4 ? (s < 0.5 ? 'shipped' : 'completed')
            : s < 0.025 ? 'refunded' : 'completed'
    if (minute < untilMinute) out.push({ no: firstNo + i, day: d, minute, customerId, lines, subtotal, shipping, total: round(subtotal + shipping), status })
  })
  return out
}

export const HISTORY_DAYS = 300
let cache: { today: Day; past: Order[]; nextNo: number } | null = null

/** All orders from HISTORY_DAYS ago up to `nowMinute` today, oldest first. Numbers are sequential. */
export function orders(today: Day, nowMinute: number): Order[] {
  if (cache?.today !== today) {
    const past: Order[] = []
    let no = 4000
    for (let d = today - HISTORY_DAYS; d < today; d++) {
      const o = dayOrders(d, today, no)
      past.push(...o)
      no += o.length
    }
    cache = { today, past, nextNo: no }
  }
  return [...cache.past, ...dayOrders(today, today, cache.nextNo, nowMinute)]
}

export const itemsIn = (o: Order) => o.lines.reduce((a, l) => a + l.qty, 0)
export const costOf = (o: Order) => round(o.lines.reduce((a, l) => a + l.qty * productById[l.productId].cost, 0))

// ---------- stock ----------
/** Stock at the start of the month (seeded), minus units sold since, plus restocks made in the demo. */
export function stockLevels(all: Order[], today: Day, restocks: Record<string, number>) {
  const p = parts(today)
  const from = day(p.y, p.m, 1)
  const sold: Record<string, number> = {}
  for (const o of all) if (o.day >= from && o.status !== 'refunded') for (const l of o.lines) sold[l.productId] = (sold[l.productId] ?? 0) + l.qty
  return PRODUCTS.map(prod => {
    const start = Math.round(prod.target * between(rng(`stock:${prod.id}:${from}`), 0.9, 1.5))
    const stock = Math.max(0, start - (sold[prod.id] ?? 0) + (restocks[prod.id] ?? 0))
    const reorder = Math.round(prod.target * 0.25)
    return { product: prod, stock, reorder, low: prod.id !== 'gift' && stock <= reorder, soldThisMonth: sold[prod.id] ?? 0 }
  })
}

// ---------- returns, carts, reviews, discounts ----------
const REASONS = ['Arrived chipped', 'Colour differs from the photo', 'Ordered the wrong size', 'Changed my mind']
export interface ReturnRequest { id: string; orderNo: number; reason: string; day: Day; amount: number }
/** Chosen from the generated history (before any change made in the demo), so a request keeps its place after a decision. */
export function returnRequests(today: Day, nowMinute: number): ReturnRequest[] {
  const candidates = orders(today, nowMinute).filter(o => o.status === 'completed' && today - o.day >= 3 && today - o.day <= 14)
  const r = rng(`returns:${today}`)
  const out: ReturnRequest[] = []
  for (let i = 0; i < 4 && candidates.length; i++) {
    const o = candidates[Math.floor(r() * candidates.length)]
    if (out.some(x => x.orderNo === o.no)) continue
    out.push({ id: `r${o.no}`, orderNo: o.no, reason: pick(r, REASONS), day: Math.min(today, o.day + 2 + Math.floor(r() * 4)), amount: o.total })
  }
  return out.sort((a, b) => b.day - a.day)
}

export interface Cart { id: string; customerId: string; lines: Line[]; value: number; at: number }
export function abandonedCarts(today: Day, nowMinute: number): Cart[] {
  const out: Cart[] = []
  for (let d = today - 2; d <= today; d++) {
    const r = rng(`carts:${key(d)}`)
    const n = 2 + Math.floor(r() * 3)
    for (let i = 0; i < n; i++) {
      const minute = Math.floor(between(r, 8 * 60, 23 * 60))
      if (d === today && minute >= nowMinute) continue
      const p = pick(r, PRODUCTS)
      const lines = [{ productId: p.id, qty: r() < 0.7 ? 1 : 2, price: p.price }]
      if (r() < 0.4) { const q = pick(r, PRODUCTS); if (q.id !== p.id) lines.push({ productId: q.id, qty: 1, price: q.price }) }
      out.push({ id: `${key(d)}-${i}`, customerId: pick(r, CUSTOMERS).id, lines, value: round(lines.reduce((a, l) => a + l.qty * l.price, 0)), at: d * 1440 + minute })
    }
  }
  return out.sort((a, b) => b.at - a.at)
}

const REVIEW_TEXT: [number, string][] = [
  [5, 'Beautiful glaze, even nicer in person.'], [5, 'Arrived quickly and very well packed.'], [4, 'Lovely mug, a little smaller than I expected.'],
  [5, 'Bought a second set as a gift.'], [3, 'Nice piece, but the colour was lighter than the photo.'], [5, 'Feels solid and the finish is perfect.'],
  [4, 'Great quality. Delivery took a few extra days.'], [2, 'One plate arrived with a small chip.'], [5, 'Our favourite bowls now.'], [4, 'Good value for handmade work.'],
]
export interface Review { id: string; customerId: string; productId: string; stars: number; text: string; day: Day }
export function reviews(today: Day): Review[] {
  const r = rng(`reviews:${Math.floor(today / 7)}`)
  return REVIEW_TEXT.map(([stars, text], i) => ({
    id: `rv${Math.floor(today / 7)}-${i}`, customerId: pick(r, CUSTOMERS).id, productId: pick(r, PRODUCTS.slice(0, 11)).id, stars, text, day: today - Math.floor(i * 2.5 + r() * 2),
  }))
}

export interface Discount { code: string; label: string; active: boolean; uses: number }
export const DISCOUNTS: Discount[] = [
  { code: 'WELCOME10', label: '10% off the first order', active: true, uses: 214 },
  { code: 'AUTUMN15', label: '15% off Tableware until Nov 30', active: true, uses: 87 },
  { code: 'FREESHIP', label: 'Free shipping from €40', active: true, uses: 342 },
  { code: 'VIP20', label: '20% off for VIP customers', active: false, uses: 29 },
]
