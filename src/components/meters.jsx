// Spending-vs-income meters. The bar's full width is your income line; spending
// fills toward it. The unfilled gap on the right is what you're saving. Color
// goes green → amber → red as spending approaches and crosses the line.

import { formatCurrency, spendStatus } from '../lib/aggregate.js'

function levelColor(level, chrome) {
  return level === 'over' ? chrome.bad : level === 'warn' ? chrome.warn : chrome.good
}

function Bar({ status, chrome, height = 12 }) {
  const color = levelColor(status.level, chrome)
  const fillPct = Math.max(status.line > 0 ? Math.min(status.ratio, 1) * 100 : status.spent > 0 ? 100 : 0, status.spent > 0 ? 3 : 0)
  return (
    <div
      className="relative w-full rounded-full overflow-hidden"
      style={{ height, background: chrome.grid }}
      role="progressbar"
      aria-valuenow={Math.round(status.ratio * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${fillPct}%`, background: color }}
      />
    </div>
  )
}

// Big hero meter for the current week.
export function HeroMeter({ spent, line, currency, chrome, rangeLabel, incomeNote }) {
  const status = spendStatus(spent, line)
  const color = levelColor(status.level, chrome)
  const word = status.level === 'over' ? 'Over your income' : status.level === 'warn' ? 'Getting close' : 'Under your income'
  const dot = status.level === 'over' ? '🔴' : status.level === 'warn' ? '🟠' : '🟢'

  return (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-[#fcfcfb] dark:bg-[#1a1a19] p-5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs uppercase tracking-wide text-[#898781]">This week{rangeLabel ? ` · ${rangeLabel}` : ''}</span>
        <span className="text-sm font-medium" style={{ color }}>{dot} {word}</span>
      </div>

      <div className="mt-2 mb-3">
        {status.level === 'over' ? (
          <div className="text-3xl font-semibold tabular-nums" style={{ color }}>
            {formatCurrency(Math.abs(status.over), currency)} over
          </div>
        ) : (
          <div className="text-3xl font-semibold tabular-nums" style={{ color }}>
            {formatCurrency(status.remaining, currency)} left to spend
          </div>
        )}
        <div className="text-sm text-[#52514e] dark:text-[#c3c2b7] mt-0.5">
          Spent <span className="tabular-nums font-medium">{formatCurrency(spent, currency)}</span> of your{' '}
          <span className="tabular-nums font-medium">{formatCurrency(line, currency)}</span> weekly income line
        </div>
      </div>

      <Bar status={status} chrome={chrome} height={16} />

      {incomeNote && <div className="mt-2 text-xs text-[#898781]">{incomeNote}</div>}
    </div>
  )
}

// Compact one-line meter for a past week.
export function WeekMeterRow({ label, spent, income, line, currency, chrome }) {
  const status = spendStatus(spent, line)
  const color = levelColor(status.level, chrome)
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-24 shrink-0 text-xs text-[#52514e] dark:text-[#c3c2b7]">{label}</div>
      <div className="flex-1">
        <Bar status={status} chrome={chrome} height={10} />
      </div>
      <div className="w-28 shrink-0 text-right text-xs tabular-nums" style={{ color }}>
        {status.level === 'over'
          ? `−${formatCurrency(Math.abs(status.over), currency)}`
          : `+${formatCurrency(status.remaining, currency)}`}
      </div>
    </div>
  )
}
