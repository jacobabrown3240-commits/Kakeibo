import { useRef, useState } from 'react'
import { Card, Button, Select, TextInput } from '../components/ui.jsx'
import { exportJSON, exportCSV, parseImportedJSON } from '../lib/export.js'
import { formatCurrency } from '../lib/aggregate.js'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'MXN', 'BRL', 'CHF']

export default function SettingsView({ state, patch, replaceState, clearAll }) {
  const { settings, categories, transactions, weeklyBudgets } = state
  const [newCat, setNewCat] = useState('')
  const [importMsg, setImportMsg] = useState('')
  const pendingImport = useRef(null)
  const fileRef = useRef(null)

  const setSetting = (k, v) => patch((s) => ({ settings: { ...s.settings, [k]: v } }))

  const addCategory = () => {
    const name = newCat.trim()
    if (!name || categories.includes(name)) return
    patch((s) => ({ categories: [...s.categories, name] }))
    setNewCat('')
  }

  const removeCategory = (name) => {
    const inUse = transactions.some((t) => t.category === name)
    if (inUse && !confirm(`"${name}" is used by some transactions. Remove it anyway? Those transactions keep the label but it won't be selectable.`)) return
    patch((s) => {
      const { [name]: _drop, ...restBudgets } = s.weeklyBudgets
      return { categories: s.categories.filter((c) => c !== name), weeklyBudgets: restBudgets }
    })
  }

  const setBudget = (cat, value) => {
    const num = value === '' ? undefined : Number(value)
    patch((s) => {
      const next = { ...s.weeklyBudgets }
      if (num == null || Number.isNaN(num) || num <= 0) delete next[cat]
      else next[cat] = num
      return { weeklyBudgets: next }
    })
  }

  const onFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        pendingImport.current = parseImportedJSON(String(reader.result))
        setImportMsg(`Loaded backup with ${pendingImport.current.transactions.length} transactions. Choose how to import:`)
      } catch (err) {
        pendingImport.current = null
        setImportMsg(`Could not read that file: ${err.message}`)
      }
    }
    reader.readAsText(file)
  }

  const doImportReplace = () => {
    if (!pendingImport.current) return
    replaceState(pendingImport.current)
    pendingImport.current = null
    setImportMsg('Backup imported (replaced all data).')
  }

  const doImportMerge = () => {
    if (!pendingImport.current) return
    const incoming = pendingImport.current.transactions
    patch((s) => ({ transactions: [...s.transactions, ...incoming] }))
    pendingImport.current = null
    setImportMsg(`Merged ${incoming.length} transactions into your data.`)
  }

  const weeklyBudgetTotal = Object.values(weeklyBudgets || {}).reduce((s, n) => s + n, 0)

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Settings</h1>

      <Card title="Preferences">
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Theme">
            <Select value={settings.theme} onChange={(v) => setSetting('theme', v)} options={[{ value: 'system', label: 'System' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
          </Field>
          <Field label="Week starts on">
            <Select value={String(settings.weekStartsOn)} onChange={(v) => setSetting('weekStartsOn', Number(v))} options={[{ value: '1', label: 'Monday' }, { value: '0', label: 'Sunday' }]} />
          </Field>
          <Field label="Currency">
            <Select value={settings.currency} onChange={(v) => setSetting('currency', v)} options={CURRENCIES} />
          </Field>
        </div>
      </Card>

      <Card title="Categories" subtitle="Used for auto-categorizing imports and grouping charts.">
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((c) => (
            <span key={c} className="inline-flex items-center gap-1.5 rounded-full bg-black/5 dark:bg-white/10 px-2.5 py-1 text-sm">
              {c}
              <button onClick={() => removeCategory(c)} className="text-[#898781] hover:text-[#d03b3b]" aria-label={`Remove ${c}`}>✕</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <TextInput
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addCategory()}
            placeholder="New category"
            className="w-48"
          />
          <Button variant="subtle" onClick={addCategory}>Add</Button>
        </div>
      </Card>

      <Card
        title="Weekly budget targets"
        subtitle={weeklyBudgetTotal > 0 ? `Total weekly target: ${formatCurrency(weeklyBudgetTotal, settings.currency)}` : 'Optional — set a weekly spending target per category.'}
      >
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
          {categories.filter((c) => c !== 'Income' && c !== 'Transfer').map((c) => (
            <div key={c} className="flex items-center justify-between gap-3">
              <span className="text-sm">{c}</span>
              <TextInput
                type="number"
                min="0"
                step="1"
                placeholder="—"
                value={weeklyBudgets?.[c] ?? ''}
                onChange={(e) => setBudget(c, e.target.value)}
                className="w-28 text-right tabular-nums"
              />
            </div>
          ))}
        </div>
      </Card>

      <Card title="Backup & data" subtitle="Everything is stored in this browser only. Export to keep a copy or move devices.">
        <div className="flex flex-wrap gap-2">
          <Button variant="subtle" onClick={() => exportJSON(state)} disabled={!transactions.length}>Export JSON backup</Button>
          <Button variant="subtle" onClick={() => exportCSV(transactions)} disabled={!transactions.length}>Export CSV</Button>
          <Button variant="subtle" onClick={() => fileRef.current?.click()}>Import JSON backup…</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} />
        </div>

        {importMsg && (
          <div className="mt-3 rounded-lg border border-black/10 dark:border-white/10 p-3 text-sm">
            <p className="mb-2">{importMsg}</p>
            {pendingImport.current && (
              <div className="flex gap-2">
                <Button variant="subtle" onClick={doImportMerge}>Merge transactions</Button>
                <Button variant="danger" onClick={doImportReplace}>Replace everything</Button>
              </div>
            )}
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-black/10 dark:border-white/10">
          <Button
            variant="danger"
            onClick={() => { if (confirm('Delete ALL data in this browser? Export a backup first if you want to keep it.')) clearAll() }}
          >
            Clear all data
          </Button>
        </div>
      </Card>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-[#898781] mb-1">{label}</span>
      {children}
    </label>
  )
}
