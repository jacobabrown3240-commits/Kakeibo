import { useMemo, useState } from 'react'
import { Card, Button, Select, TextInput, EmptyState, Badge } from '../components/ui.jsx'
import { formatCurrency, monthsPresent } from '../lib/aggregate.js'
import { monthLabel, shortDate, monthKey, isValidISO } from '../lib/date.js'
import { slotColor, otherColor } from '../lib/categorize.js'

export default function TransactionsView({
  state,
  dark,
  updateTransaction,
  deleteTransaction,
  deleteMany,
  goImport,
}) {
  const { transactions, categories, settings } = state
  const months = useMemo(() => monthsPresent(transactions), [transactions])
  const [monthFilter, setMonthFilter] = useState('all')
  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [editing, setEditing] = useState(null)
  const [selected, setSelected] = useState(new Set())

  const colorFor = useMemo(() => {
    const map = new Map(categories.map((c, i) => [c, slotColor(i, dark)]))
    return (c) => map.get(c) || otherColor(dark)
  }, [categories, dark])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return transactions
      .filter((t) => (monthFilter === 'all' ? true : monthKey(t.date) === monthFilter))
      .filter((t) => (typeFilter === 'all' ? true : t.type === typeFilter))
      .filter((t) => (q ? t.description.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) : true))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [transactions, monthFilter, typeFilter, query])

  const shownTotal = filtered.reduce((s, t) => s + (t.type === 'expense' ? t.amount : -t.amount), 0)

  const toggleSelect = (id) =>
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const allShownSelected = filtered.length > 0 && filtered.every((t) => selected.has(t.id))
  const toggleAll = () =>
    setSelected((prev) => {
      if (allShownSelected) {
        const next = new Set(prev)
        filtered.forEach((t) => next.delete(t.id))
        return next
      }
      return new Set([...prev, ...filtered.map((t) => t.id)])
    })

  const deleteSelected = () => {
    if (!selected.size) return
    if (!confirm(`Delete ${selected.size} transaction${selected.size === 1 ? '' : 's'}?`)) return
    deleteMany([...selected])
    setSelected(new Set())
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <EmptyState icon="🧾" title="No transactions yet" action={<Button onClick={goImport}>Import your first statement</Button>}>
          Once you import transactions they’ll appear here, where you can edit categories, fix amounts, or delete entries.
        </EmptyState>
      </Card>
    )
  }

  const cur = settings.currency

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-lg font-semibold">Transactions</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <TextInput placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-40" />
          <Select
            value={typeFilter}
            onChange={setTypeFilter}
            options={[{ value: 'all', label: 'All types' }, { value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }]}
          />
          <Select
            value={monthFilter}
            onChange={setMonthFilter}
            options={[{ value: 'all', label: 'All months' }, ...months.map((m) => ({ value: m, label: monthLabel(m) }))]}
          />
        </div>
      </div>

      <Card>
        <div className="flex items-center justify-between gap-3 mb-2 text-sm">
          <div className="text-[#52514e] dark:text-[#c3c2b7]">
            {filtered.length} shown · net{' '}
            <span className={shownTotal <= 0 ? 'text-[#006300] dark:text-[#0ca30c]' : 'text-[#0b0b0b] dark:text-white'}>
              {formatCurrency(-shownTotal, cur)}
            </span>
          </div>
          {selected.size > 0 && (
            <Button variant="danger" onClick={deleteSelected}>Delete {selected.size} selected</Button>
          )}
        </div>

        <div className="overflow-x-auto thin-scroll -mx-2">
          <table className="w-full text-sm border-collapse min-w-[640px]">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[#898781]">
                <th className="px-2 py-2 w-8">
                  <input type="checkbox" checked={allShownSelected} onChange={toggleAll} aria-label="Select all shown" />
                </th>
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Description</th>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2 text-right">Amount</th>
                <th className="px-2 py-2 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const isEditing = editing === t.id
                return (
                  <tr key={t.id} className="border-t border-black/5 dark:border-white/5">
                    <td className="px-2 py-1.5">
                      <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} aria-label="Select row" />
                    </td>
                    {isEditing ? (
                      <EditRow t={t} categories={categories} onSave={(patch) => { updateTransaction(t.id, patch); setEditing(null) }} onCancel={() => setEditing(null)} />
                    ) : (
                      <>
                        <td className="px-2 py-1.5 tabular-nums whitespace-nowrap text-[#52514e] dark:text-[#c3c2b7]">{shortDate(t.date)}</td>
                        <td className="px-2 py-1.5">{t.description}</td>
                        <td className="px-2 py-1.5"><Badge color={colorFor(t.category)}>{t.category}</Badge></td>
                        <td className={'px-2 py-1.5 text-right tabular-nums font-medium ' + (t.type === 'income' ? 'text-[#006300] dark:text-[#0ca30c]' : '')}>
                          {t.type === 'income' ? '+' : ''}{formatCurrency(t.amount, cur)}
                        </td>
                        <td className="px-2 py-1.5">
                          <div className="flex justify-end gap-1">
                            <button onClick={() => setEditing(t.id)} className="text-[#898781] hover:text-[#256abf] px-1" aria-label="Edit">✎</button>
                            <button onClick={() => { if (confirm('Delete this transaction?')) deleteTransaction(t.id) }} className="text-[#898781] hover:text-[#d03b3b] px-1" aria-label="Delete">✕</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && <p className="text-sm text-[#898781] text-center py-6">No transactions match your filters.</p>}
      </Card>
    </div>
  )
}

function EditRow({ t, categories, onSave, onCancel }) {
  const [date, setDate] = useState(t.date)
  const [description, setDescription] = useState(t.description)
  const [category, setCategory] = useState(categories.includes(t.category) ? t.category : 'Other')
  const [type, setType] = useState(t.type)
  const [amount, setAmount] = useState(t.amount)

  const valid = isValidISO(date) && Number(amount) > 0

  return (
    <>
      <td className="px-2 py-1.5"><TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[9.5rem]" /></td>
      <td className="px-2 py-1.5"><TextInput value={description} onChange={(e) => setDescription(e.target.value)} className="w-full min-w-[8rem]" /></td>
      <td className="px-2 py-1.5">
        <div className="flex gap-1">
          <Select value={category} onChange={setCategory} options={categories} />
          <Select value={type} onChange={setType} options={[{ value: 'expense', label: 'Exp' }, { value: 'income', label: 'Inc' }]} />
        </div>
      </td>
      <td className="px-2 py-1.5 text-right"><TextInput type="number" step="0.01" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-24 text-right tabular-nums" /></td>
      <td className="px-2 py-1.5">
        <div className="flex justify-end gap-1">
          <button disabled={!valid} onClick={() => onSave({ date, description, category, type, amount: Number(amount) })} className="text-[#006300] disabled:opacity-30 px-1" aria-label="Save">✓</button>
          <button onClick={onCancel} className="text-[#898781] px-1" aria-label="Cancel">↩</button>
        </div>
      </td>
    </>
  )
}
