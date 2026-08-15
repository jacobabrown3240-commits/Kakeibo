import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, Button, Select, TextInput, EmptyState } from '../components/ui.jsx'
import { ocrImages } from '../lib/ocr.js'
import { parseTransactions, blankRow } from '../lib/parse.js'
import { parseCSV, detectColumns, csvToTransactions, looksLikeHeader } from '../lib/csv.js'
import { parseOFX, isOFX } from '../lib/ofx.js'
import { isValidISO } from '../lib/date.js'

const thisYear = new Date().getFullYear()
const YEARS = [thisYear, thisYear - 1, thisYear - 2, thisYear - 3]

const MODES = [
  { id: 'screenshot', label: '📷 Screenshot', hint: 'Read a statement image on-device (OCR)' },
  { id: 'csv', label: '📄 CSV', hint: 'Import a transactions CSV from your bank' },
  { id: 'ofx', label: '🏦 OFX / QFX', hint: 'Import a bank OFX/QFX download (most accurate)' },
]

function readFileText(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = reject
    r.readAsText(file)
  })
}

export default function ImportView({ state, addTransactions, goToDashboard }) {
  const { categories, settings } = state
  const [mode, setMode] = useState('screenshot')
  const [rows, setRows] = useState([])
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  const resetForImport = () => {
    setRows([])
    setError('')
  }

  const save = () => {
    const validRows = rows.filter((r) => r.include && isValidISO(r.date) && Number(r.amount) > 0)
    if (!validRows.length) return
    const toAdd = validRows.map(({ id, include, ...rest }) => ({
      ...rest,
      id: `sv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      amount: Number(rest.amount),
    }))
    addTransactions(toAdd)
    setSavedMsg(`Added ${toAdd.length} transaction${toAdd.length === 1 ? '' : 's'}.`)
    setRows([])
  }

  const validCount = rows.filter((r) => r.include && isValidISO(r.date) && Number(r.amount) > 0).length
  const invalidCount = rows.filter((r) => r.include).length - validCount

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Import transactions</h1>
        <p className="text-sm text-[#52514e] dark:text-[#c3c2b7] mt-1">
          Everything is processed on your device — nothing is uploaded.
        </p>
      </div>

      {savedMsg && (
        <div className="rounded-xl border border-[#0ca30c]/40 bg-[#0ca30c]/10 px-4 py-3 text-sm flex items-center justify-between gap-3">
          <span>✅ {savedMsg}</span>
          <Button variant="subtle" onClick={goToDashboard}>View dashboard</Button>
        </div>
      )}

      {/* Source switcher */}
      <div className="flex flex-wrap gap-2">
        {MODES.map((m) => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); resetForImport() }}
            className={
              'rounded-lg px-3 py-2 text-sm font-medium transition border ' +
              (mode === m.id
                ? 'bg-[#256abf] text-white border-transparent'
                : 'border-black/10 dark:border-white/10 text-[#52514e] dark:text-[#c3c2b7] hover:bg-black/5 dark:hover:bg-white/10')
            }
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="-mt-3 text-xs text-[#898781]">{MODES.find((m) => m.id === mode)?.hint}</p>

      {mode === 'screenshot' && (
        <ScreenshotPanel categories={categories} setRows={setRows} setError={setError} error={error} />
      )}
      {mode === 'csv' && (
        <CSVPanel categories={categories} setRows={setRows} setError={setError} error={error} readFileText={readFileText} />
      )}
      {mode === 'ofx' && (
        <OFXPanel categories={categories} setRows={setRows} setError={setError} error={error} readFileText={readFileText} />
      )}

      {rows.length > 0 && (
        <Card
          title={`Review ${rows.length} detected ${rows.length === 1 ? 'row' : 'rows'}`}
          subtitle="Fix anything that looks wrong, then save. Uncheck rows to skip them."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setRows((p) => [...p, blankRow(categories.includes('Other') ? 'Other' : categories[0])])}>+ Add row</Button>
              <Button onClick={save} disabled={!validCount}>
                Add {validCount} transaction{validCount === 1 ? '' : 's'}
              </Button>
            </div>
          }
        >
          {invalidCount > 0 && (
            <p className="mb-2 text-xs text-[#d03b3b]">
              {invalidCount} checked row{invalidCount === 1 ? '' : 's'} still need a valid date and amount.
            </p>
          )}
          <ReviewTable
            rows={rows}
            categories={categories}
            currency={settings.currency}
            updateRow={(id, patch) => setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)))}
            removeRow={(id) => setRows((p) => p.filter((r) => r.id !== id))}
          />
        </Card>
      )}
    </div>
  )
}

/* ---------------- Screenshot (OCR) ---------------- */

function ScreenshotPanel({ categories, setRows, setError, error }) {
  const [images, setImages] = useState([])
  const [rawText, setRawText] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statementYear, setStatementYear] = useState(thisYear)
  const fileInputRef = useRef(null)
  const dropRef = useRef(null)

  useEffect(() => () => images.forEach((im) => URL.revokeObjectURL(im.url)), [images])

  const addFiles = useCallback((fileList) => {
    const imgs = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (!imgs.length) return
    setImages((prev) => [
      ...prev,
      ...imgs.map((f) => ({ id: `${f.name}_${f.size}_${Math.random().toString(36).slice(2)}`, file: f, url: URL.createObjectURL(f) })),
    ])
    setError('')
  }, [setError])

  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      const files = []
      for (const it of items) if (it.type.startsWith('image/')) files.push(it.getAsFile())
      if (files.length) { addFiles(files); e.preventDefault() }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  const removeImage = (id) =>
    setImages((prev) => {
      const t = prev.find((i) => i.id === id)
      if (t) URL.revokeObjectURL(t.url)
      return prev.filter((i) => i.id !== id)
    })

  const runOCR = async () => {
    if (!images.length) return
    setBusy(true); setError(''); setProgress(0)
    try {
      const text = await ocrImages(images.map((i) => i.file), (p) => setProgress(p))
      setRawText(text)
      const parsed = parseTransactions(text, { defaultYear: statementYear, categories })
      setRows(parsed)
      if (!parsed.length) {
        setError('No transactions detected. Try a clearer/zoomed-in screenshot, or paste the text below. For best accuracy, a CSV or OFX export from your bank works far better.')
        setShowRaw(true)
      }
    } catch (e) {
      console.error(e)
      setError('OCR failed to run. You can paste the statement text manually instead.')
      setShowRaw(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <div className="mb-3 rounded-lg bg-[#eda100]/10 border border-[#eda100]/30 px-3 py-2 text-xs text-[#52514e] dark:text-[#c3c2b7]">
        Screenshot OCR is best-effort and can misread messy statements. If your bank offers a
        <strong> CSV</strong> or <strong>OFX/QFX</strong> download, those tabs are far more accurate.
      </div>
      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); dropRef.current?.classList.add('ring-2') }}
        onDragLeave={() => dropRef.current?.classList.remove('ring-2')}
        onDrop={(e) => { e.preventDefault(); dropRef.current?.classList.remove('ring-2'); if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files) }}
        className="rounded-xl border-2 border-dashed border-black/15 dark:border-white/15 ring-[#2a78d6]/60 p-6 text-center transition"
      >
        <div className="text-3xl mb-2" aria-hidden>📷</div>
        <p className="text-sm text-[#52514e] dark:text-[#c3c2b7]">
          Drag & drop screenshots, <button className="text-[#256abf] font-medium underline" onClick={() => fileInputRef.current?.click()}>browse</button>, or paste (⌘/Ctrl+V)
        </p>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = '' }} />
      </div>

      {images.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {images.map((im) => (
            <div key={im.id} className="relative">
              <img src={im.url} alt="statement screenshot" className="h-24 w-auto rounded-lg border border-black/10 dark:border-white/10 object-cover" />
              <button onClick={() => removeImage(im.id)} className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[#d03b3b] text-white text-xs shadow" aria-label="Remove image">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-[#52514e] dark:text-[#c3c2b7]">Statement year</label>
          <Select value={String(statementYear)} onChange={(v) => setStatementYear(Number(v))} options={YEARS.map(String)} />
        </div>
        <Button onClick={runOCR} disabled={!images.length || busy}>
          {busy ? `Reading… ${Math.round(progress * 100)}%` : `Read ${images.length || ''} screenshot${images.length === 1 ? '' : 's'}`}
        </Button>
        <Button variant="ghost" onClick={() => setShowRaw((v) => !v)}>{showRaw ? 'Hide text' : 'Paste text instead'}</Button>
      </div>

      {busy && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className="h-full bg-[#256abf] transition-all" style={{ width: `${progress * 100}%` }} />
        </div>
      )}

      {error && <p className="mt-3 text-sm text-[#d03b3b]">{error}</p>}

      {showRaw && (
        <div className="mt-4">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={'Paste statement lines, e.g.\n08/12  STARBUCKS STORE 1234  5.75\n08/13  AMAZON.COM*AB12  42.19'}
            rows={6}
            className="w-full rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#111] text-sm px-3 py-2 font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-[#2a78d6]/60"
          />
          <div className="mt-2">
            <Button variant="subtle" onClick={() => { const p = parseTransactions(rawText, { defaultYear: statementYear, categories }); setRows(p); setError(p.length ? '' : 'No transactions found in that text.') }} disabled={!rawText.trim()}>Parse text</Button>
          </div>
        </div>
      )}
    </Card>
  )
}

/* ---------------- CSV ---------------- */

function CSVPanel({ categories, setRows, setError, error, readFileText }) {
  const [csvRows, setCsvRows] = useState(null)
  const [hasHeader, setHasHeader] = useState(true)
  const [mapping, setMapping] = useState(null)
  const [expenseSign, setExpenseSign] = useState('negative')
  const [fileName, setFileName] = useState('')
  const fileRef = useRef(null)

  const onFile = async (file) => {
    if (!file) return
    setError(''); setFileName(file.name)
    try {
      const text = await readFileText(file)
      const parsed = parseCSV(text)
      if (!parsed.length) { setError('That file looks empty.'); return }
      const header = looksLikeHeader(parsed[0])
      setHasHeader(header)
      setCsvRows(parsed)
      setMapping(detectColumns(header ? parsed[0] : parsed[0].map((_, i) => `Column ${i + 1}`)))
    } catch (e) {
      console.error(e); setError('Could not read that CSV file.')
    }
  }

  const colOptions = (allowNone) => {
    if (!csvRows) return []
    const head = hasHeader ? csvRows[0] : csvRows[0].map((_, i) => `Column ${i + 1}`)
    const opts = head.map((h, i) => ({ value: String(i), label: h?.trim() || `Column ${i + 1}` }))
    return allowNone ? [{ value: '-1', label: '— none —' }, ...opts] : opts
  }

  const doParse = () => {
    if (!csvRows || !mapping) return
    const parsed = csvToTransactions(csvRows, mapping, { hasHeader, expenseSign, categories })
    setRows(parsed)
    setError(parsed.length ? '' : 'No rows could be parsed — check the column mapping.')
  }

  const usingSingleAmount = mapping && mapping.debit < 0 && mapping.credit < 0

  return (
    <Card title="Import a CSV">
      <div className="rounded-xl border-2 border-dashed border-black/15 dark:border-white/15 p-5 text-center">
        <p className="text-sm text-[#52514e] dark:text-[#c3c2b7]">
          <button className="text-[#256abf] font-medium underline" onClick={() => fileRef.current?.click()}>Choose a CSV file</button>
          {fileName && <span className="ml-2 text-[#898781]">· {fileName}</span>}
        </p>
        <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
      </div>

      {error && <p className="mt-3 text-sm text-[#d03b3b]">{error}</p>}

      {csvRows && mapping && (
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
            First row is a header
          </label>

          <div className="grid sm:grid-cols-3 gap-3">
            <MapField label="Date column"><Select value={String(mapping.date)} onChange={(v) => setMapping({ ...mapping, date: Number(v) })} options={colOptions(false)} /></MapField>
            <MapField label="Description column"><Select value={String(mapping.description)} onChange={(v) => setMapping({ ...mapping, description: Number(v) })} options={colOptions(false)} /></MapField>
            <MapField label="Category column (optional)"><Select value={String(mapping.category)} onChange={(v) => setMapping({ ...mapping, category: Number(v) })} options={colOptions(true)} /></MapField>
            <MapField label="Amount column"><Select value={String(mapping.amount)} onChange={(v) => setMapping({ ...mapping, amount: Number(v) })} options={colOptions(true)} /></MapField>
            <MapField label="Debit column (optional)"><Select value={String(mapping.debit)} onChange={(v) => setMapping({ ...mapping, debit: Number(v) })} options={colOptions(true)} /></MapField>
            <MapField label="Credit column (optional)"><Select value={String(mapping.credit)} onChange={(v) => setMapping({ ...mapping, credit: Number(v) })} options={colOptions(true)} /></MapField>
          </div>

          {usingSingleAmount && (
            <MapField label="In the Amount column, spending is shown as">
              <Select value={expenseSign} onChange={setExpenseSign} options={[{ value: 'negative', label: 'Negative numbers (−) — most common' }, { value: 'positive', label: 'Positive numbers (+)' }]} />
            </MapField>
          )}

          <Button variant="subtle" onClick={doParse}>Parse {csvRows.length - (hasHeader ? 1 : 0)} rows</Button>
        </div>
      )}
    </Card>
  )
}

/* ---------------- OFX / QFX ---------------- */

function OFXPanel({ categories, setRows, setError, error, readFileText }) {
  const [fileName, setFileName] = useState('')
  const fileRef = useRef(null)

  const onFile = async (file) => {
    if (!file) return
    setError(''); setFileName(file.name)
    try {
      const text = await readFileText(file)
      if (!isOFX(text)) { setError("That doesn't look like an OFX/QFX file."); return }
      const parsed = parseOFX(text, { categories })
      setRows(parsed)
      setError(parsed.length ? '' : 'No transactions found in that file.')
    } catch (e) {
      console.error(e); setError('Could not read that file.')
    }
  }

  return (
    <Card title="Import OFX / QFX">
      <p className="mb-3 text-xs text-[#898781]">
        Most banks offer this under “Download transactions” (formats: OFX, QFX, sometimes “Quicken” or “Money”). It’s fully structured, so it imports accurately with no OCR.
      </p>
      <div className="rounded-xl border-2 border-dashed border-black/15 dark:border-white/15 p-5 text-center">
        <p className="text-sm text-[#52514e] dark:text-[#c3c2b7]">
          <button className="text-[#256abf] font-medium underline" onClick={() => fileRef.current?.click()}>Choose an OFX / QFX file</button>
          {fileName && <span className="ml-2 text-[#898781]">· {fileName}</span>}
        </p>
        <input ref={fileRef} type="file" accept=".ofx,.qfx,application/x-ofx" className="hidden" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      {error && <p className="mt-3 text-sm text-[#d03b3b]">{error}</p>}
    </Card>
  )
}

function MapField({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wide text-[#898781] mb-1">{label}</span>
      {children}
    </label>
  )
}

/* ---------------- Shared review table ---------------- */

function ReviewTable({ rows, categories, currency, updateRow, removeRow }) {
  return (
    <div className="overflow-x-auto thin-scroll -mx-2">
      <table className="w-full text-sm border-collapse min-w-[720px]">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-[#898781]">
            <th className="px-2 py-2 w-8"></th>
            <th className="px-2 py-2">Date</th>
            <th className="px-2 py-2">Description</th>
            <th className="px-2 py-2">Category</th>
            <th className="px-2 py-2">Type</th>
            <th className="px-2 py-2 text-right">Amount</th>
            <th className="px-2 py-2 w-8"></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const invalid = r.include && (!isValidISO(r.date) || !(Number(r.amount) > 0))
            return (
              <tr key={r.id} className={'border-t border-black/5 dark:border-white/5 ' + (!r.include ? 'opacity-40 ' : '') + (invalid ? 'bg-[#d03b3b]/5' : '')}>
                <td className="px-2 py-1.5">
                  <input type="checkbox" checked={r.include} onChange={(e) => updateRow(r.id, { include: e.target.checked })} aria-label="Include row" />
                </td>
                <td className="px-2 py-1.5"><TextInput type="date" value={r.date} onChange={(e) => updateRow(r.id, { date: e.target.value })} className="w-[9.5rem]" /></td>
                <td className="px-2 py-1.5"><TextInput value={r.description} onChange={(e) => updateRow(r.id, { description: e.target.value })} className="w-full min-w-[10rem]" /></td>
                <td className="px-2 py-1.5">
                  <Select value={categories.includes(r.category) ? r.category : 'Other'} onChange={(v) => updateRow(r.id, { category: v })} options={categories} />
                </td>
                <td className="px-2 py-1.5">
                  <Select value={r.type} onChange={(v) => updateRow(r.id, { type: v, category: v === 'income' && r.category === 'Other' ? 'Income' : r.category })} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />
                </td>
                <td className="px-2 py-1.5 text-right"><TextInput type="number" step="0.01" min="0" value={r.amount} onChange={(e) => updateRow(r.id, { amount: e.target.value })} className="w-28 text-right tabular-nums" /></td>
                <td className="px-2 py-1.5">
                  <button onClick={() => removeRow(r.id)} className="text-[#898781] hover:text-[#d03b3b] px-1" aria-label="Delete row">✕</button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
