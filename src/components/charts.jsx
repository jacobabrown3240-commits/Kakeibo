// Chart components built on Recharts, styled from the resolved theme tokens so
// they read correctly in both light and dark. Forms follow the data-viz method:
//  - Weekly spending  -> stacked bars (composition of a magnitude over weeks)
//  - Monthly overview -> grouped bars, income vs expense, single $ axis
//  - Category totals  -> ranked horizontal bars (magnitude, one hue)

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  LabelList,
} from 'recharts'
import { formatCurrency } from '../lib/aggregate.js'

const compactCurrency = (n) => {
  const abs = Math.abs(n)
  if (abs >= 1000) return `$${(n / 1000).toFixed(abs >= 10000 ? 0 : 1)}k`
  return `$${Math.round(n)}`
}

function TooltipBox({ chrome, title, rows, total, currency }) {
  return (
    <div
      className="rounded-lg border shadow-md text-xs px-3 py-2"
      style={{
        background: chrome.surface,
        borderColor: chrome.grid,
        color: chrome.textPrimary,
      }}
    >
      <div className="font-semibold mb-1">{title}</div>
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2 py-0.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ background: r.color }}
            aria-hidden
          />
          <span style={{ color: chrome.textSecondary }} className="mr-2">
            {r.name}
          </span>
          <span className="ml-auto tabular-nums font-medium">
            {formatCurrency(r.value, currency)}
          </span>
        </div>
      ))}
      {total != null && (
        <div
          className="flex justify-between gap-4 mt-1 pt-1 tabular-nums font-semibold"
          style={{ borderTop: `1px solid ${chrome.grid}` }}
        >
          <span>Total</span>
          <span>{formatCurrency(total, currency)}</span>
        </div>
      )}
    </div>
  )
}

const axisProps = (chrome) => ({
  tick: { fill: chrome.muted, fontSize: 12 },
  axisLine: { stroke: chrome.axis },
  tickLine: false,
})

export function WeeklyStackedBar({ data, keys, colorFor, chrome, currency }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={chrome.grid} />
        <XAxis dataKey="label" {...axisProps(chrome)} />
        <YAxis tickFormatter={compactCurrency} width={48} {...axisProps(chrome)} />
        <Tooltip
          cursor={{ fill: chrome.grid, opacity: 0.4 }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const rows = payload
              .filter((p) => p.value > 0)
              .map((p) => ({ name: p.name, value: p.value, color: p.color }))
              .reverse()
            const total = rows.reduce((s, r) => s + r.value, 0)
            return (
              <TooltipBox chrome={chrome} title={label} rows={rows} total={total} currency={currency} />
            )
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: chrome.textSecondary, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        {keys.map((k, i) => (
          <Bar
            key={k}
            dataKey={k}
            stackId="spend"
            fill={colorFor(k)}
            stroke={chrome.surface}
            strokeWidth={2}
            radius={i === keys.length - 1 ? [4, 4, 0, 0] : 0}
            maxBarSize={72}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MonthlyIncomeExpense({ data, chrome, currency, incomeColor, expenseColor, monthLabelFn }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
        <CartesianGrid vertical={false} stroke={chrome.grid} />
        <XAxis dataKey="monthKey" tickFormatter={monthLabelFn} {...axisProps(chrome)} />
        <YAxis tickFormatter={compactCurrency} width={48} {...axisProps(chrome)} />
        <Tooltip
          cursor={{ fill: chrome.grid, opacity: 0.4 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const mk = payload[0]?.payload?.monthKey
            const income = payload.find((p) => p.dataKey === 'income')?.value || 0
            const expense = payload.find((p) => p.dataKey === 'expense')?.value || 0
            return (
              <TooltipBox
                chrome={chrome}
                title={monthLabelFn(mk)}
                currency={currency}
                rows={[
                  { name: 'Income', value: income, color: incomeColor },
                  { name: 'Spending', value: expense, color: expenseColor },
                  { name: 'Net', value: income - expense, color: chrome.muted },
                ]}
              />
            )
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: 12, color: chrome.textSecondary, paddingTop: 8 }}
          iconType="circle"
          iconSize={8}
        />
        <Bar dataKey="income" name="Income" fill={incomeColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
        <Bar dataKey="expense" name="Spending" fill={expenseColor} radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function CategoryRankedBar({ data, chrome, currency, color }) {
  const height = Math.max(160, data.length * 38 + 16)
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={chrome.grid} />
        <XAxis type="number" tickFormatter={compactCurrency} {...axisProps(chrome)} />
        <YAxis
          type="category"
          dataKey="name"
          width={112}
          tick={{ fill: chrome.textSecondary, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: chrome.grid, opacity: 0.4 }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const p = payload[0]
            return (
              <TooltipBox
                chrome={chrome}
                title={p.payload.name}
                currency={currency}
                rows={[{ name: 'Spent', value: p.value, color }]}
              />
            )
          }}
        />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} maxBarSize={26}>
          <LabelList
            dataKey="value"
            position="right"
            formatter={(v) => formatCurrency(v, currency)}
            style={{ fill: chrome.textSecondary, fontSize: 11 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
