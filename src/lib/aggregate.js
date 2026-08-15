// Aggregation helpers that turn the flat transaction list into the series the
// dashboard charts consume.

import { monthKey, weekStartISO, weekRangeLabel, fromISO } from './date.js'

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

export const signed = (n) => (n < 0 ? `-${Math.abs(n).toFixed(2)}` : n.toFixed(2))

export function filterByMonth(txns, mk) {
  return txns.filter((t) => monthKey(t.date) === mk)
}

// Distinct month keys present in the data, newest first.
export function monthsPresent(txns) {
  const set = new Set(txns.map((t) => monthKey(t.date)))
  return [...set].sort((a, b) => (a < b ? 1 : -1))
}

// Weekly breakdown for a given month: one row per week that overlaps the month,
// with a total-expense field plus one field per category (for a stacked bar).
export function weeklyBreakdown(txns, mk, categories, weekStartsOn = 1) {
  const monthTxns = filterByMonth(txns, mk)
  const byWeek = new Map()

  for (const t of monthTxns) {
    if (t.type !== 'expense') continue
    const ws = weekStartISO(t.date, weekStartsOn)
    if (!byWeek.has(ws)) {
      const row = { weekStart: ws, label: weekRangeLabel(ws), total: 0 }
      for (const c of categories) row[c] = 0
      byWeek.set(ws, row)
    }
    const row = byWeek.get(ws)
    row.total += t.amount
    row[t.category] = (row[t.category] || 0) + t.amount
  }

  return [...byWeek.values()].sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1))
}

// Income vs expense for a given month.
export function monthTotals(txns, mk) {
  const m = filterByMonth(txns, mk)
  let income = 0
  let expense = 0
  for (const t of m) {
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }
  return { income, expense, net: income - expense }
}

// A month-over-month series of income vs expense for the trend chart.
export function monthlySeries(txns, limit = 12) {
  const map = new Map()
  for (const t of txns) {
    const mk = monthKey(t.date)
    if (!map.has(mk)) map.set(mk, { monthKey: mk, income: 0, expense: 0 })
    const row = map.get(mk)
    if (t.type === 'income') row.income += t.amount
    else row.expense += t.amount
  }
  const rows = [...map.values()]
    .map((r) => ({ ...r, net: r.income - r.expense }))
    .sort((a, b) => (a.monthKey < b.monthKey ? -1 : 1))
  return rows.slice(-limit)
}

// Expense totals per category for a set of transactions (for the pie/donut).
export function categoryTotals(txns) {
  const map = new Map()
  for (const t of txns) {
    if (t.type !== 'expense') continue
    map.set(t.category, (map.get(t.category) || 0) + t.amount)
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function daysElapsedInMonth(mk) {
  const [y, m] = mk.split('-').map(Number)
  const today = new Date()
  const isCurrent = today.getFullYear() === y && today.getMonth() + 1 === m
  const daysInMonth = new Date(y, m, 0).getDate()
  return {
    elapsed: isCurrent ? today.getDate() : daysInMonth,
    total: daysInMonth,
    isCurrent,
  }
}
