// Line/area charts for the money trend. Forms follow the data-viz method:
// change-over-time -> line/area with a crosshair + tooltip. No bars, no
// categories.
//   - Balance trend  -> area of the running balance (is my money up or down?)
//   - Weekly cash flow -> line of each week's net (money in minus money out)

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Dot,
} from 'recharts'
import { formatCurrency } from '../lib/aggregate.js'

const compactCurrency = (n) => {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1000) return `${sign}$${(abs / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
  return `${sign}$${Math.round(abs)}`
}

const axisProps = (chrome) => ({
  tick: { fill: chrome.muted, fontSize: 12 },
  axisLine: { stroke: chrome.axis },
  tickLine: false,
})

function TrendTooltip({ chrome, currency, active, payload }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload
  const good = chrome.good
  const bad = chrome.bad
  const netColor = row.net >= 0 ? good : bad
  const fmt = (n) => `${n >= 0 ? '+' : '−'}${formatCurrency(Math.abs(n), currency)}`
  return (
    <div
      className="rounded-lg border shadow-md text-xs px-3 py-2"
      style={{ background: chrome.surface, borderColor: chrome.grid, color: chrome.textPrimary }}
    >
      <div className="font-semibold mb-1">Week of {row.label}</div>
      {row.balance !== undefined && (
        <div className="flex justify-between gap-6 py-0.5">
          <span style={{ color: chrome.textSecondary }}>Balance</span>
          <span className="tabular-nums font-medium">{formatCurrency(row.balance, currency)}</span>
        </div>
      )}
      <div className="flex justify-between gap-6 py-0.5">
        <span style={{ color: chrome.textSecondary }}>This week</span>
        <span className="tabular-nums font-medium" style={{ color: netColor }}>{fmt(row.net)}</span>
      </div>
      <div className="flex justify-between gap-6 py-0.5">
        <span style={{ color: chrome.textSecondary }}>In · Out</span>
        <span className="tabular-nums">
          {formatCurrency(row.income, currency)} · {formatCurrency(row.expense, currency)}
        </span>
      </div>
    </div>
  )
}

export function BalanceArea({ data, chrome, currency, color }) {
  const line = color || chrome.textPrimary
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={line} stopOpacity={0.35} />
            <stop offset="100%" stopColor={line} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={chrome.grid} />
        <XAxis dataKey="label" {...axisProps(chrome)} minTickGap={24} />
        <YAxis tickFormatter={compactCurrency} width={52} {...axisProps(chrome)} />
        <ReferenceLine y={0} stroke={chrome.axis} strokeDasharray="3 3" />
        <Tooltip
          cursor={{ stroke: chrome.muted, strokeWidth: 1 }}
          content={(p) => <TrendTooltip {...p} chrome={chrome} currency={currency} />}
        />
        <Area
          type="monotone"
          dataKey="balance"
          stroke={line}
          strokeWidth={2}
          fill="url(#balanceFill)"
          dot={false}
          activeDot={{ r: 4, stroke: chrome.surface, strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function WeeklyNetLine({ data, chrome, currency }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={chrome.grid} />
        <XAxis dataKey="label" {...axisProps(chrome)} minTickGap={24} />
        <YAxis tickFormatter={compactCurrency} width={52} {...axisProps(chrome)} />
        <ReferenceLine y={0} stroke={chrome.axis} />
        <Tooltip
          cursor={{ stroke: chrome.muted, strokeWidth: 1 }}
          content={(p) => <TrendTooltip {...p} chrome={chrome} currency={currency} />}
        />
        <Line
          type="monotone"
          dataKey="net"
          stroke={chrome.muted}
          strokeWidth={2}
          dot={(props) => {
            const { cx, cy, payload, index } = props
            const c = payload.net >= 0 ? chrome.good : chrome.bad
            return <Dot key={index} cx={cx} cy={cy} r={3.5} fill={c} stroke={chrome.surface} strokeWidth={1.5} />
          }}
          activeDot={{ r: 5, stroke: chrome.surface, strokeWidth: 2 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
