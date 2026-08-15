import { useRef, useState } from 'react'
import { Card, Button, Select, TextInput } from '../components/ui.jsx'
import { exportJSON, exportCSV, parseImportedJSON } from '../lib/export.js'
import { formatCurrency } from '../lib/aggregate.js'

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'MXN', 'BRL', 'CHF']

export default function SettingsView({ state, patch, replaceState, clearAll }) {
  const { settings, transactions } = state
  const [importMsg, setImportMsg] = useState('')
  const pendingImport = useRef(null)
  const fileRef = useRef(null)

  const setSetting = (k, v) => patch((s) => ({ settings: { ...s.settings, [k]: v } }))

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

      <Card
        title="Starting balance"
        subtitle="Optional. The balance trend starts from this amount, so the line reflects your real money — not just the change since your first import."
      >
        <div className="flex items-center gap-3">
          <TextInput
            type="number"
            step="0.01"
            value={settings.startingBalance ?? 0}
            onChange={(e) => setSetting('startingBalance', Number(e.target.value) || 0)}
            className="w-40 text-right tabular-nums"
          />
          <span className="text-sm text-[#898781]">
            currently {formatCurrency(settings.startingBalance || 0, settings.currency)}
          </span>
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
