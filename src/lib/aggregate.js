// Aggregation helpers that turn the flat transaction list into the series the
// dashboard charts consume. No categories — just income vs expense and the
// running balance over time.

import { monthKey, weekStartISO, weekRangeLabel, fromISO, toISO } from './date.js'

export function formatCurrency(n, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(n || 0)
  } catch {
    return `$${(n || 0).toFixed(2)}`
  }
}

export function filterByMonth(txns, mk) {
  return txns.filter((t) => monthKey(t.date) === mk)
}

export function monthsPresent(txns) {
  const set = new Set(txns.map((t) => monthKey(t.date)))
  return [...set].sort((a, b) => (a < b ? 1 : -1))
}

// Income vs expense totals for a set of transactions.
export function totals(txns) {
  let income = 0
  let expense = 0
  for (const t of txns) {
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense, net: income - expense }
}

// One row per week from the first transaction's week through the last, with
// gaps filled so the line is continuous. `balance` is the running total
// (startingBalance + cumulative net) — this is the "is my money going up or
// down" series.
export function weeklySeries(txns, { weekStartsOn = 1, startingBalance = 0 } = {}) {
  if (!txns.length) return []

  const byWeek = new Map()
  for (const t of txns) {
    if (!t.date) continue
    const ws = weekStartISO(t.date, weekStartsOn)
    if (!byWeek.has(ws)) byWeek.set(ws, { income: 0, expense: 0 })
    const w = byWeek.get(ws)
    if (t.type === 'income') w.income += t.amount
    else w.expense += t.amount
  }
  if (!byWeek.size) return []

  const keys = [...byWeek.keys()].sort()
  const cur = fromISO(keys[0])
  const end = fromISO(keys[keys.length - 1])
  const out = []
  let running = startingBalance

  while (cur <= end) {
    const ws = toISO(cur.getFullYear(), cur.getMonth() + 1, cur.getDate())
    const w = byWeek.get(ws) || { income: 0, expense: 0 }
    const net = w.income - w.expense
    running += net
    out.push({
      weekStart: ws,
      label: weekRangeLabel(ws),
      income: w.income,
      expense: w.expense,
      net,
      balance: running,
    })
    cur.setDate(cur.getDate() + 7)
  }
  return out
}

// Keep the last N weeks (or all). Balances already reflect the true running
// total from the beginning, so slicing the tail is safe.
export function lastNWeeks(series, n) {
  if (!n || n >= series.length) return series
  return series.slice(-n)
}
