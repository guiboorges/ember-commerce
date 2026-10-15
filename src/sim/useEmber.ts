import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { fromDate } from './dates'
import { pnlMonths } from './finance'
import { allOrders, balanceChange, cardSpend, freshState, reduce, storeKpis, toEur, walletBalances, type Action, type EmberState } from './state'

const KEY = 'ember-commerce:v1'
// The clock advances every 15 s; new orders appear as their minute passes.
export const TICK_MS = 15_000

const minuteOf = (t: Date) => t.getHours() * 60 + t.getMinutes()

function load(): EmberState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return JSON.parse(raw) as EmberState
  } catch {
    // Private mode or blocked storage: start fresh.
  }
  return freshState(Date.now())
}

export function useEmber() {
  const [now, setNow] = useState(() => new Date())
  const today = fromDate(now)
  const nowMinute = minuteOf(now)
  const [state, dispatch] = useReducer((s: EmberState, a: Action) => {
    const t = new Date()
    return reduce(s, a, { today: fromDate(t), now: t.getTime(), nowMinute: minuteOf(t) })
  }, undefined, load)

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), TICK_MS)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* the demo still works without storage */ }
  }, [state])

  const view = useMemo(() => {
    const orders = allOrders(state, today, nowMinute)
    const wallets = walletBalances(state)
    const totalEur = wallets.reduce((a, w) => a + toEur(w.balance, w.currency), 0)
    return {
      orders, wallets, totalEur, balanceDelta: balanceChange(orders, today, totalEur),
      kpis: storeKpis(orders, today), cards: cardSpend(state, today), pnl: pnlMonths(orders, today),
    }
  }, [state, today, nowMinute])

  const act = useCallback((a: Action) => dispatch(a), [])
  return { state, now, today, nowMinute, ...view, act }
}

export type EmberApi = ReturnType<typeof useEmber>
