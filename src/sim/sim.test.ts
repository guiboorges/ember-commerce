import { describe, expect, it } from 'vitest'
import { abandonedCarts, dayOrders, orders, PRODUCTS, returnRequests, stockLevels } from './catalog'
import { day, key, monthStart } from './dates'
import { bills, costs, pnl, pnlMonths, vatDue } from './finance'
import { allOrders, cardSpend, freshState, reduce, storeKpis, walletBalances, type EmberState } from './state'

const OCT15 = day(2026, 9, 15)
const NOON = 12 * 60
const ctx = { today: OCT15, now: Date.UTC(2026, 9, 15, 12), nowMinute: NOON }
const fresh = (): EmberState => freshState(ctx.now)

describe('store', () => {
  it('generates the same orders for a day every time, numbered in sequence', () => {
    expect(dayOrders(OCT15 - 3, OCT15, 100)).toEqual(dayOrders(OCT15 - 3, OCT15, 100))
    const all = orders(OCT15, NOON)
    for (let i = 1; i < all.length; i++) expect(all[i].no).toBe(all[i - 1].no + 1)
  })

  it('only shows today\'s orders placed before the current minute', () => {
    const morning = orders(OCT15, 9 * 60).filter(o => o.day === OCT15)
    const evening = orders(OCT15, 22 * 60).filter(o => o.day === OCT15)
    expect(morning.every(o => o.minute < 9 * 60)).toBe(true)
    expect(evening.length).toBeGreaterThan(morning.length)
  })

  it('looks like a small shop: about 900 orders and €45–70k a month, with a profit', () => {
    const all = orders(OCT15, NOON)
    const sept = pnl(all, day(2026, 8, 1), day(2026, 8, 30))
    expect(sept.orders).toBeGreaterThan(700)
    expect(sept.orders).toBeLessThan(1200)
    expect(sept.revenue).toBeGreaterThan(40000)
    expect(sept.revenue).toBeLessThan(75000)
    expect(sept.profit).toBeGreaterThan(0)
    expect(sept.costs).toBeCloseTo(sept.cogs + sept.fees + sept.marketing + sept.payroll + sept.rent + sept.supplies, 1)
  })

  it('builds 8 P&L months ending with the current month', () => {
    const months = pnlMonths(orders(OCT15, NOON), OCT15)
    expect(months.map(m => m.label)).toEqual(['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'])
    expect(months.at(-1)!.to).toBe(OCT15)
  })

  it('tracks stock: sales lower it, restocks raise it', () => {
    const s = fresh()
    const all = allOrders(s, OCT15, NOON)
    const before = stockLevels(all, OCT15, {}).find(x => x.product.id === 'mug')!
    const after = stockLevels(all, OCT15, { mug: 50 }).find(x => x.product.id === 'mug')!
    expect(after.stock).toBe(before.stock + 50)
    expect(before.soldThisMonth).toBeGreaterThan(0)
    expect(stockLevels(all, OCT15, {})).toHaveLength(PRODUCTS.length)
  })

  it('seeds returns from recent completed orders and carts from the last three days', () => {
    const all = orders(OCT15, NOON)
    const r = returnRequests(OCT15, NOON)
    expect(r.length).toBeGreaterThan(0)
    for (const x of r) expect(all.find(o => o.no === x.orderNo)!.status).toBe('completed')
    expect(abandonedCarts(OCT15, NOON).every(c => c.at <= OCT15 * 1440 + NOON)).toBe(true)
  })
})

describe('actions', () => {
  it('ships pending and processing orders only', () => {
    const s = fresh()
    const open = allOrders(s, OCT15, NOON).filter(o => o.status === 'pending' || o.status === 'processing').slice(0, 3)
    const done = allOrders(s, OCT15, NOON).find(o => o.status === 'completed')!
    const next = reduce(s, { type: 'ship', nos: [...open.map(o => o.no), done.no] }, ctx)
    const after = allOrders(next, OCT15, NOON)
    for (const o of open) expect(after.find(x => x.no === o.no)!.status).toBe('shipped')
    expect(after.find(x => x.no === done.no)!.status).toBe('completed')
  })

  it('a refund takes the money out of the EUR wallet and out of revenue', () => {
    const s = fresh()
    const o = allOrders(s, OCT15, NOON).filter(x => x.day === OCT15 - 1 && x.status === 'shipped')[0]
    const next = reduce(s, { type: 'refund', no: o.no }, ctx)
    expect(walletBalances(next)[0].balance).toBeCloseTo(walletBalances(s)[0].balance - o.total, 2)
    expect(storeKpis(allOrders(next, OCT15, NOON), OCT15).revenue).toBeCloseTo(storeKpis(allOrders(s, OCT15, NOON), OCT15).revenue - o.total, 2)
  })

  it('approving a return refunds the order; declining does not', () => {
    const s = fresh()
    const [a, b] = returnRequests(OCT15, NOON)
    let next = reduce(s, { type: 'return', id: a.id, no: a.orderNo, decision: 'approved' }, ctx)
    expect(allOrders(next, OCT15, NOON).find(o => o.no === a.orderNo)!.status).toBe('refunded')
    next = reduce(next, { type: 'return', id: b.id, no: b.orderNo, decision: 'declined' }, ctx)
    expect(allOrders(next, OCT15, NOON).find(o => o.no === b.orderNo)!.status).toBe('completed')
  })

  it('transfers cannot overdraw a wallet or use a paused one; requests do not move money', () => {
    const s = fresh()
    const eur = walletBalances(s)[0]
    expect(reduce(s, { type: 'transfer', currency: 'EUR', to: 'Clayworks', amount: eur.balance + 1, note: '' }, ctx)).toBe(s)
    expect(reduce(s, { type: 'transfer', currency: 'GBP', to: 'Studio London', amount: 10, note: '' }, ctx)).toBe(s)
    const sent = reduce(s, { type: 'transfer', currency: 'USD', to: 'Etched Co.', amount: 1200, note: 'Samples' }, ctx)
    expect(walletBalances(sent)[1].balance).toBeCloseTo(walletBalances(s)[1].balance - 1200, 2)
    const asked = reduce(s, { type: 'request', currency: 'EUR', from: 'Atlas Studio', amount: 500, note: 'Wholesale' }, ctx)
    expect(walletBalances(asked)[0].balance).toBe(walletBalances(s)[0].balance)
  })

  it('pays a bill and VAT once', () => {
    const s = fresh()
    const b = bills(OCT15)[0]
    const paid = reduce(s, { type: 'payBill', id: b.id, supplier: b.supplier, amount: b.amount }, ctx)
    expect(reduce(paid, { type: 'payBill', id: b.id, supplier: b.supplier, amount: b.amount }, ctx)).toBe(paid)
    const v = vatDue(orders(OCT15, NOON), OCT15)
    expect(key(v.due)).toBe('2026-11-20')
    expect(v.toPay).toBeGreaterThan(0)
  })

  it('counts card spending against the monthly limit, and freezing is remembered', () => {
    const s = fresh()
    const c = cardSpend(s, OCT15)
    const total = costs(monthStart(OCT15), OCT15).filter(x => x.card).reduce((a, x) => a + x.amount, 0)
    expect(c.total).toBeCloseTo(total, 1)
    const frozen = reduce(s, { type: 'freeze', card: 'marketing', on: true }, ctx)
    expect(cardSpend(frozen, OCT15).cards[0].frozen).toBe(true)
  })
})
