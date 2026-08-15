import { useMemo, useState } from 'react'
import { Card, Button, EmptyState, Badge } from '../components/ui.jsx'
import { dailyTotals, formatCurrency, totals, monthsPresent, filterByMonth } from '../lib/aggregate.js'
import {
  monthGrid, weekdayLabels, monthLabel, addMonths, currentMonthKey,
  todayISO, fromISO,
} from '../lib/date.js'

// Compact money for the tight day cells: "-$42", "+$1.2k".
function compact(n) {
  const abs = Math.abs(n)
  const sign = n < 0 ? '−' : '+'
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
  return `${sign}$${Math.round(abs)}`
}

// hex (#rrggbb) + 0..1 alpha -> rgba() string, for the spend heat tint.
function tint(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

export default function CalendarView({ state, dark, chrome, goImport }) {
  const { transactions, settings } = state
  const cur = settings.currency

  const present = useMemo(() => monthsPresent(transactions), [transactions])
  // Default to the most recent month that has activity, else the current month.
  const [mk, setMk] = useState(() => present[0] || currentMonthKey())
  const [selected, setSelected] = useState(null)

  const byDay = useMemo(() => dailyTotals(transactions), [transactions])
  const grid = useMemo(() => monthGrid(mk, settings.weekStartsOn), [mk, settings.weekStartsOn])
  const heads = useMemo(() => weekdayLabels(settings.weekStartsOn), [settings.weekStartsOn])
  const monthTotals = useMemo(() => totals(filterByMonth(transactions, mk)), [transactions, mk])

  // Scale the spend-heat tint against the busiest expense day this month.
  const maxExpense = useMemo(() => {
    let mx = 0
    for (const week of grid) for (const c of week) {
      if (!c.inMonth) continue
      const d = byDay.get(c.iso)
      if (d && d.expense > mx) mx = d.expense
    }
    return mx
  }, [grid, byDay])

  if (transactions.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="📅"
          title="No transactions to show yet"
          action={<Button onClick={goImport}>Import transactions</Button>}
        >
          Import your income and expenses and they’ll appear here on a monthly calendar, so you can
          see which days you spent the most at a glance.
        </EmptyState>
      </Card>
    )
  }

  const today = todayISO()
  const selectedDay = selected ? byDay.get(selected) : null
  const goToday = () => { setMk(currentMonthKey()); setSelected(null) }
  const step = (delta) => { setMk((m) => addMonths(m, delta)); setSelected(null) }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-semibold">Calendar</h1>
        <div className="flex items-center gap-1.5">
          <Button variant="subtle" onClick={() => step(-1)} aria-label="Previous month">‹</Button>
          <div className="min-w-[9.5rem] text-center text-sm font-medium tabular-nums">{monthLabel(mk)}</div>
          <Button variant="subtle" onClick={() => step(1)} aria-label="Next month">›</Button>
          <Button variant="ghost" onClick={goToday} className="ml-1">Today</Button>
        </div>
      </div>

      {/* Month summary */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStat label="Income" value={formatCurrency(monthTotals.income, cur)} tone="good" />
        <MiniStat label="Spent" value={formatCurrency(monthTotals.expense, cur)} tone="bad" />
        <MiniStat
          label="Net"
          value={`${monthTotals.net >= 0 ? '+' : '−'}${formatCurrency(Math.abs(monthTotals.net), cur)}`}
          tone={monthTotals.net >= 0 ? 'good' : 'bad'}
        />
      </div>

      <Card>
        {/* Weekday header */}
        <div className="grid grid-cols-7 gap-1 sm:gap-1.5 mb-1.5">
          {heads.map((h) => (
            <div key={h} className="text-center text-[11px] font-medium uppercase tracking-wide text-[#898781] pb-1">
              <span className="hidden sm:inline">{h}</span>
              <span className="sm:hidden">{h[0]}</span>
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="space-y-1 sm:space-y-1.5">
          {grid.map((week, i) => (
            <div key={i} className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {week.map((cell) => (
                <DayCell
                  key={cell.iso}
                  cell={cell}
                  day={byDay.get(cell.iso)}
                  maxExpense={maxExpense}
                  isToday={cell.iso === today}
                  isSelected={cell.iso === selected}
                  onSelect={() => setSelected((s) => (s === cell.iso ? null : cell.iso))}
                  chrome={chrome}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#898781]">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded" style={{ background: tint(chrome.bad, 0.5) }} aria-hidden />
            Darker red = more spent that day
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: chrome.good }} aria-hidden />
            Income
          </span>
          <span>Tap a day for details</span>
        </div>
      </Card>

      {/* Selected day detail */}
      {selected && (
        <Card
          title={longDate(selected)}
          subtitle={
            selectedDay
              ? `${selectedDay.txns.length} transaction${selectedDay.txns.length === 1 ? '' : 's'}`
              : 'No activity on this day'
          }
          actions={<Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>}
        >
          {selectedDay ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {selectedDay.income > 0 && <Badge color={chrome.good}>In {formatCurrency(selectedDay.income, cur)}</Badge>}
                {selectedDay.expense > 0 && <Badge color={chrome.bad}>Out {formatCurrency(selectedDay.expense, cur)}</Badge>}
                <Badge color={selectedDay.net >= 0 ? chrome.good : chrome.bad}>
                  Net {selectedDay.net >= 0 ? '+' : '−'}{formatCurrency(Math.abs(selectedDay.net), cur)}
                </Badge>
              </div>
              <ul className="divide-y divide-black/5 dark:divide-white/5">
                {selectedDay.txns.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="text-sm truncate">{t.description || '(no description)'}</span>
                    <span
                      className="text-sm font-medium tabular-nums whitespace-nowrap"
                      style={{ color: t.type === 'income' ? chrome.good : chrome.bad }}
                    >
                      {t.type === 'income' ? '+' : '−'}{formatCurrency(t.amount, cur)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-[#898781] py-2">Nothing recorded on this day.</p>
          )}
        </Card>
      )}
    </div>
  )
}

function DayCell({ cell, day, maxExpense, isToday, isSelected, onSelect, chrome }) {
  const dayNum = Number(cell.iso.slice(-2))
  const hasActivity = !!day
  const heat = day && day.expense > 0 && maxExpense > 0
    ? tint(chrome.bad, 0.14 + 0.5 * (day.expense / maxExpense))
    : undefined

  const base =
    'relative rounded-lg border p-1 sm:p-1.5 min-h-[3.5rem] sm:min-h-[4.75rem] text-left transition ' +
    'flex flex-col overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a78d6]/60 '
  const tone = cell.inMonth
    ? 'border-black/10 dark:border-white/10 '
    : 'border-transparent opacity-40 '
  const ring = isSelected ? 'ring-2 ring-[#256abf] ' : isToday ? 'ring-1 ring-[#256abf]/60 ' : ''
  const hover = hasActivity ? 'hover:brightness-95 dark:hover:brightness-110 cursor-pointer ' : 'cursor-default '

  return (
    <button
      type="button"
      onClick={hasActivity ? onSelect : undefined}
      disabled={!hasActivity}
      className={base + tone + ring + hover}
      style={{ background: heat }}
      aria-label={hasActivity ? `${cell.iso}: ${day.txns.length} transactions` : cell.iso}
    >
      <div className="flex items-center justify-between">
        <span
          className={
            'text-[11px] sm:text-xs tabular-nums ' +
            (isToday ? 'font-semibold text-[#256abf]' : 'text-[#52514e] dark:text-[#c3c2b7]')
          }
        >
          {dayNum}
        </span>
        {day && day.income > 0 && (
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: chrome.good }} aria-hidden />
        )}
      </div>
      {day && (
        <div className="mt-auto leading-tight">
          {day.expense > 0 && (
            <div className="text-[10px] sm:text-xs font-semibold tabular-nums" style={{ color: chrome.bad }}>
              {compact(-day.expense)}
            </div>
          )}
          {day.income > 0 && day.expense === 0 && (
            <div className="text-[10px] sm:text-xs font-semibold tabular-nums" style={{ color: chrome.good }}>
              {compact(day.income)}
            </div>
          )}
        </div>
      )}
    </button>
  )
}

function MiniStat({ label, value, tone }) {
  const color = { good: 'text-[#006300] dark:text-[#0ca30c]', bad: 'text-[#d03b3b] dark:text-[#e66767]' }[tone]
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-[#fcfcfb] dark:bg-[#1a1a19] px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-[#898781]">{label}</div>
      <div className={`mt-0.5 text-lg sm:text-xl font-semibold tabular-nums ${color}`}>{value}</div>
    </div>
  )
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
function longDate(iso) {
  const d = fromISO(iso)
  return `${WD[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`
}
