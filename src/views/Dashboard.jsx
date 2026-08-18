import { useMemo, useState } from 'react'
import { Card, StatTile, Select, Button, EmptyState } from '../components/ui.jsx'
import { BalanceArea } from '../components/charts.jsx'
import { HeroMeter, WeekMeterRow } from '../components/meters.jsx'
import { slotColor } from '../lib/categorize.js'
import {
  formatCurrency,
  totals,
  weeklySeries,
  lastNWeeks,
  averageWeeklyIncome,
} from '../lib/aggregate.js'
import { weekStartISO, weekRangeLabel, todayISO } from '../lib/date.js'

const RANGES = [
  { value: '8', label: 'Last 8 weeks' },
  { value: '12', label: 'Last 12 weeks' },
  { value: '26', label: 'Last 26 weeks' },
  { value: 'all', label: 'All time' },
]

export default function Dashboard({ state, dark, chrome, goImport }) {
  const { transactions, settings } = state
  const [range, setRange] = useState('8')

  const fullSeries = useMemo(
    () =>
      weeklySeries(transactions, {
        weekStartsOn: settings.weekStartsOn,
        anchorEndBalance: settings.currentBalance ?? null,
      }),
    [transactions, settings.weekStartsOn, settings.currentBalance],
  )

  const cur = settings.currency
  const accent = slotColor(0, dark)

  if (transactions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="🎯"
          title="No transactions yet"
          action={<Button onClick={goImport}>Import transactions</Button>}
        >
          Import your income and expenses and Kakeibo will show, each week, how close your spending
          is to your income — so you can see yourself saving.
        </EmptyState>
      </Card>
    )
  }

  // The income line each week is measured against.
  const avgIncome = averageWeeklyIncome(fullSeries)
  const usingExpected = settings.expectedWeeklyIncome != null && settings.expectedWeeklyIncome > 0
  const incomeLine = usingExpected ? settings.expectedWeeklyIncome : avgIncome
  const incomeNote = usingExpected
    ? `Income line: your expected ${formatCurrency(incomeLine, cur)}/week (change in Settings)`
    : `Income line: your average ${formatCurrency(incomeLine, cur)}/week — set a fixed target in Settings`

  // Hero = the most recent week with activity (labeled "This week" if it's the
  // current calendar week, otherwise "Latest week").
  const heroWeek = fullSeries[fullSeries.length - 1]
  const isThisWeek = heroWeek.weekStart === weekStartISO(todayISO(), settings.weekStartsOn)

  const recent = useMemo(() => {
    const sliced = range === 'all' ? fullSeries : lastNWeeks(fullSeries, Number(range))
    return [...sliced].reverse() // most recent first
  }, [fullSeries, range])

  const rangeStart = recent.length ? recent[recent.length - 1].weekStart : null
  const rangeTxns = rangeStart ? transactions.filter((t) => t.date >= rangeStart) : transactions
  const t = totals(rangeTxns)
  const currentBalance = fullSeries[fullSeries.length - 1].balance
  const anchored = settings.currentBalance != null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-semibold">Overview</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#52514e] dark:text-[#c3c2b7]">Range</label>
          <Select value={range} onChange={setRange} options={RANGES} />
        </div>
      </div>

      {/* Hero: this week's spending vs income line */}
      <HeroMeter
        spent={heroWeek.expense}
        line={incomeLine}
        currency={cur}
        chrome={chrome}
        rangeLabel={isThisWeek ? weekRangeLabel(heroWeek.weekStart) : `latest · ${weekRangeLabel(heroWeek.weekStart)}`}
        incomeNote={incomeNote}
      />

      {/* Recent weeks: streak of under/over */}
      <Card title="Recent weeks" subtitle="How close each week's spending got to your income line — the number is what you saved (＋) or overspent (−).">
        <div className="divide-y divide-black/5 dark:divide-white/5">
          {recent.map((w) => (
            <WeekMeterRow
              key={w.weekStart}
              label={weekRangeLabel(w.weekStart)}
              spent={w.expense}
              income={w.income}
              line={incomeLine}
              currency={cur}
              chrome={chrome}
            />
          ))}
        </div>
      </Card>

      {/* Small summary + overall trajectory */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <StatTile
          label={anchored ? 'Current balance' : 'Net so far'}
          value={formatCurrency(currentBalance, cur)}
          tone={currentBalance >= 0 ? 'good' : 'bad'}
          hint={anchored ? undefined : 'Set your balance in Settings'}
        />
        <StatTile label="Income (range)" value={formatCurrency(t.income, cur)} tone="good" />
        <StatTile
          label="Saved (range)"
          value={`${t.net >= 0 ? '+' : '−'}${formatCurrency(Math.abs(t.net), cur)}`}
          tone={t.net >= 0 ? 'good' : 'bad'}
          hint={t.net >= 0 ? 'income minus spending' : 'spent more than earned'}
        />
      </div>

      <Card title="Balance over time" subtitle="Your running balance, week by week.">
        <BalanceArea data={range === 'all' ? fullSeries : lastNWeeks(fullSeries, Number(range))} chrome={chrome} currency={cur} color={accent} />
      </Card>
    </div>
  )
}
