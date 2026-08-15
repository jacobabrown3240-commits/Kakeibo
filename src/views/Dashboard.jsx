import { useMemo, useState } from 'react'
import { Card, StatTile, Select, Button, EmptyState } from '../components/ui.jsx'
import { WeeklyStackedBar, MonthlyIncomeExpense, CategoryRankedBar } from '../components/charts.jsx'
import { slotColor, otherColor } from '../lib/categorize.js'
import {
  formatCurrency,
  monthsPresent,
  weeklyBreakdown,
  monthTotals,
  monthlySeries,
  categoryTotals,
  filterByMonth,
  daysElapsedInMonth,
} from '../lib/aggregate.js'
import { monthLabel, currentMonthKey } from '../lib/date.js'

const MAX_STACK = 6 // top N categories shown in the weekly stack; rest -> "Other"

export default function Dashboard({ state, dark, chrome, goImport }) {
  const { transactions, settings, weeklyBudgets } = state
  const months = useMemo(() => monthsPresent(transactions), [transactions])

  const defaultMonth = months.includes(currentMonthKey()) ? currentMonthKey() : months[0]
  const [month, setMonth] = useState(defaultMonth)
  const activeMonth = months.includes(month) ? month : defaultMonth

  const incomeColor = slotColor(2, dark) // aqua
  const expenseColor = slotColor(1, dark) // orange
  const seqColor = slotColor(0, dark) // blue

  const totals = useMemo(
    () => (activeMonth ? monthTotals(transactions, activeMonth) : { income: 0, expense: 0, net: 0 }),
    [transactions, activeMonth],
  )

  const monthCatTotals = useMemo(
    () => (activeMonth ? categoryTotals(filterByMonth(transactions, activeMonth)) : []),
    [transactions, activeMonth],
  )

  // Category keys for the weekly stack: top N by month spend, then "Other".
  const { stackKeys, colorFor } = useMemo(() => {
    const top = monthCatTotals.slice(0, MAX_STACK).map((c) => c.name)
    const hasOther = monthCatTotals.length > MAX_STACK
    const keys = hasOther ? [...top, 'Other'] : top
    const colorMap = new Map(top.map((name, i) => [name, slotColor(i, dark)]))
    if (hasOther) colorMap.set('Other', otherColor(dark))
    return {
      stackKeys: keys,
      colorFor: (k) => colorMap.get(k) || otherColor(dark),
    }
  }, [monthCatTotals, dark])

  const weekly = useMemo(() => {
    if (!activeMonth) return []
    const rows = weeklyBreakdown(transactions, activeMonth, state.categories, settings.weekStartsOn)
    // Collapse categories outside the top N into an "Other" bucket per week.
    const topSet = new Set(stackKeys.filter((k) => k !== 'Other'))
    return rows.map((row) => {
      const out = { label: row.label, weekStart: row.weekStart, total: row.total }
      let other = 0
      for (const cat of state.categories) {
        if (topSet.has(cat)) out[cat] = row[cat] || 0
        else other += row[cat] || 0
      }
      if (stackKeys.includes('Other')) out.Other = other
      return out
    })
  }, [transactions, activeMonth, state.categories, settings.weekStartsOn, stackKeys])

  const trend = useMemo(() => monthlySeries(transactions, 12), [transactions])

  if (transactions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="📷"
          title="No transactions yet"
          action={<Button onClick={goImport}>Import from a screenshot</Button>}
        >
          Screenshot your credit-card or debit statement and import it — Kakeibo reads the
          transactions on your device and shows your weekly spending and monthly income vs. spending.
        </EmptyState>
      </Card>
    )
  }

  const { elapsed, total: daysInMonth, isCurrent } = activeMonth
    ? daysElapsedInMonth(activeMonth)
    : { elapsed: 30, total: 30, isCurrent: false }

  const savingsRate = totals.income > 0 ? (totals.net / totals.income) * 100 : null
  const avgWeekly = weekly.length ? weekly.reduce((s, w) => s + w.total, 0) / weekly.length : 0
  const projectedSpend = isCurrent && elapsed > 0 ? (totals.expense / elapsed) * daysInMonth : null

  const cur = settings.currency

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-semibold">Overview</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#52514e] dark:text-[#c3c2b7]">Month</label>
          <Select
            value={activeMonth}
            onChange={setMonth}
            options={months.map((m) => ({ value: m, label: monthLabel(m) }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile label="Income" value={formatCurrency(totals.income, cur)} tone="good" />
        <StatTile label="Spending" value={formatCurrency(totals.expense, cur)} />
        <StatTile
          label="Net"
          value={formatCurrency(totals.net, cur)}
          tone={totals.net >= 0 ? 'good' : 'bad'}
          hint={totals.net >= 0 ? 'Saved this month' : 'Overspent this month'}
        />
        <StatTile
          label="Savings rate"
          value={savingsRate == null ? '—' : `${savingsRate.toFixed(0)}%`}
          tone={savingsRate != null && savingsRate >= 0 ? 'good' : savingsRate != null ? 'bad' : 'default'}
          hint={savingsRate == null ? 'Add income to compute' : 'of income kept'}
        />
      </div>

      <Card
        title="Weekly spending"
        subtitle={`${monthLabel(activeMonth)} · avg ${formatCurrency(avgWeekly, cur)}/week`}
      >
        {weekly.length ? (
          <WeeklyStackedBar
            data={weekly}
            keys={stackKeys}
            colorFor={colorFor}
            chrome={chrome}
            currency={cur}
          />
        ) : (
          <p className="text-sm text-[#898781] py-8 text-center">No spending recorded this month.</p>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card
          title="Monthly income vs. spending"
          subtitle={projectedSpend != null ? `Projected spend this month: ${formatCurrency(projectedSpend, cur)}` : 'Last 12 months'}
        >
          {trend.length ? (
            <MonthlyIncomeExpense
              data={trend}
              chrome={chrome}
              currency={cur}
              incomeColor={incomeColor}
              expenseColor={expenseColor}
              monthLabelFn={monthLabel}
            />
          ) : (
            <p className="text-sm text-[#898781] py-8 text-center">Not enough data yet.</p>
          )}
        </Card>

        <Card title="Where the money went" subtitle={monthLabel(activeMonth)}>
          {monthCatTotals.length ? (
            <CategoryRankedBar data={monthCatTotals} chrome={chrome} currency={cur} color={seqColor} />
          ) : (
            <p className="text-sm text-[#898781] py-8 text-center">No spending recorded this month.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
