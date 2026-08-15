import { useMemo, useState } from 'react'
import { Card, StatTile, Select, Button, EmptyState } from '../components/ui.jsx'
import { BalanceArea, WeeklyNetLine } from '../components/charts.jsx'
import { slotColor } from '../lib/categorize.js'
import { formatCurrency, totals, weeklySeries, lastNWeeks } from '../lib/aggregate.js'

const RANGES = [
  { value: '8', label: 'Last 8 weeks' },
  { value: '12', label: 'Last 12 weeks' },
  { value: '26', label: 'Last 26 weeks' },
  { value: 'all', label: 'All time' },
]

export default function Dashboard({ state, dark, chrome, goImport }) {
  const { transactions, settings } = state
  const [range, setRange] = useState('12')

  const fullSeries = useMemo(
    () =>
      weeklySeries(transactions, {
        weekStartsOn: settings.weekStartsOn,
        startingBalance: settings.startingBalance || 0,
      }),
    [transactions, settings.weekStartsOn, settings.startingBalance],
  )

  const series = useMemo(
    () => (range === 'all' ? fullSeries : lastNWeeks(fullSeries, Number(range))),
    [fullSeries, range],
  )

  const cur = settings.currency
  const accent = slotColor(0, dark) // blue

  if (transactions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="📈"
          title="No transactions yet"
          action={<Button onClick={goImport}>Import transactions</Button>}
        >
          Import your income and expenses (bank CSV/OFX, or a screenshot) and Kakeibo will show
          whether your money is trending up or down, week by week.
        </EmptyState>
      </Card>
    )
  }

  // Totals across the transactions that fall in the displayed weeks.
  const rangeStart = series.length ? series[0].weekStart : null
  const rangeTxns = rangeStart ? transactions.filter((t) => t.date >= rangeStart) : transactions
  const t = totals(rangeTxns)

  const currentBalance = fullSeries.length
    ? fullSeries[fullSeries.length - 1].balance
    : settings.startingBalance || 0
  const rangeChange = currentBalanceInRange(series)
  const trendingUp = rangeChange >= 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-semibold">Overview</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#52514e] dark:text-[#c3c2b7]">Range</label>
          <Select value={range} onChange={setRange} options={RANGES} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile
          label="Current balance"
          value={formatCurrency(currentBalance, cur)}
          tone={currentBalance >= 0 ? 'good' : 'bad'}
        />
        <StatTile label="Income (range)" value={formatCurrency(t.income, cur)} tone="good" />
        <StatTile label="Expenses (range)" value={formatCurrency(t.expense, cur)} />
        <StatTile
          label="Net (range)"
          value={`${t.net >= 0 ? '+' : '−'}${formatCurrency(Math.abs(t.net), cur)}`}
          tone={t.net >= 0 ? 'good' : 'bad'}
          hint={t.net >= 0 ? 'Money saved' : 'Money spent down'}
        />
      </div>

      <Card
        title="Balance trend"
        subtitle={
          series.length > 1
            ? `Your money is trending ${trendingUp ? 'up ▲' : 'down ▼'} over this range`
            : 'Running balance week by week'
        }
      >
        {series.length ? (
          <BalanceArea data={series} chrome={chrome} currency={cur} color={accent} />
        ) : (
          <p className="text-sm text-[#898781] py-8 text-center">Not enough data yet.</p>
        )}
      </Card>

      <Card
        title="Weekly cash flow"
        subtitle="Money in minus money out each week — above the line is a surplus, below is a shortfall"
      >
        {series.length ? (
          <WeeklyNetLine data={series} chrome={chrome} currency={cur} />
        ) : (
          <p className="text-sm text-[#898781] py-8 text-center">Not enough data yet.</p>
        )}
      </Card>
    </div>
  )
}

// Net change in balance across the displayed weeks (sum of weekly nets).
function currentBalanceInRange(series) {
  return series.reduce((s, w) => s + w.net, 0)
}
