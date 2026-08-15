import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, Button, Select, TextInput, EmptyState } from '../components/ui.jsx'
import { ocrImages } from '../lib/ocr.js'
import { parseTransactions, blankRow } from '../lib/parse.js'
import { isValidISO } from '../lib/date.js'

const thisYear = new Date().getFullYear()
const YEARS = [thisYear, thisYear - 1, thisYear - 2, thisYear - 3]

export default function ImportView({ state, addTransactions, goToDashboard }) {
  const { categories, settings } = state
  const [images, setImages] = useState([]) // {id, file, url}
  const [rows, setRows] = useState([])
  const [rawText, setRawText] = useState('')
  const [showRaw, setShowRaw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statementYear, setStatementYear] = useState(thisYear)
  const [error, setError] = useState('')
  const [savedMsg, setSavedMsg] = useState('')
  const fileInputRef = useRef(null)
  const dropRef = useRef(null)

  // Clean up object URLs.
  useEffect(() => () => images.forEach((im) => URL.revokeObjectURL(im.url)), [images])

  const addFiles = useCallback((fileList) => {
    const imgs = Array.from(fileList).filter((f) => f.type.startsWith('image/'))
    if (!imgs.length) return
    setImages((prev) => [
      ...prev,
      ...imgs.map((f) => ({ id: `${f.name}_${f.size}_${Math.random().toString(36).slice(2)}`, file: f, url: URL.createObjectURL(f) })),
    ])
    setError('')
  }, [])

  // Paste-from-clipboard support (screenshot straight into the page).
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      const files = []
      for (const it of items) if (it.type.startsWith('image/')) files.push(it.getAsFile())
      if (files.length) {
        addFiles(files)
        e.preventDefault()
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [addFiles])

  const onDrop = useCallback(
    (e) => {
      e.preventDefault()
      dropRef.current?.classList.remove('ring-2')
      if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )

  const removeImage = (id) =>
    setImages((prev) => {
      const target = prev.find((i) => i.id === id)
      if (target) URL.revokeObjectURL(target.url)
      return prev.filter((i) => i.id !== id)
    })

  const runOCR = async () => {
    if (!images.length) return
    setBusy(true)
    setError('')
    setProgress(0)
    try {
      const text = await ocrImages(
        images.map((i) => i.file),
        (p) => setProgress(p),
      )
      setRawText(text)
      const parsed = parseTransactions(text, { defaultYear: statementYear, categories })
      setRows(parsed)
      if (parsed.length === 0) {
        setError('No transactions detected. Try a clearer screenshot, or paste the text manually below.')
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

  const parseFromText = () => {
    const parsed = parseTransactions(rawText, { defaultYear: statementYear, categories })
    setRows(parsed)
    setError(parsed.length ? '' : 'No transactions found in that text.')
  }

  const updateRow = (id, patch) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  const removeRow = (id) => setRows((prev) => prev.filter((r) => r.id !== id))

  const addBlankRow = () => setRows((prev) => [...prev, blankRow(categories.includes('Other') ? 'Other' : categories[0])])

  const validRows = rows.filter((r) => r.include && isValidISO(r.date) && Number(r.amount) > 0)
  const invalidCount = rows.filter((r) => r.include).length - validRows.length

  const save = () => {
    if (!validRows.length) return
    const toAdd = validRows.map(({ id, include, ...rest }) => ({
      ...rest,
      id: `sv_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      amount: Number(rest.amount),
    }))
    addTransactions(toAdd)
    setSavedMsg(`Added ${toAdd.length} transaction${toAdd.length === 1 ? '' : 's'}.`)
    setRows([])
    setRawText('')
    images.forEach((im) => URL.revokeObjectURL(im.url))
    setImages([])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Import transactions</h1>
        <p className="text-sm text-[#52514e] dark:text-[#c3c2b7] mt-1">
          Screenshot your statement and drop it here. Text is read on your device — nothing is uploaded.
        </p>
      </div>

      {savedMsg && (
        <div className="rounded-xl border border-[#0ca30c]/40 bg-[#0ca30c]/10 px-4 py-3 text-sm flex items-center justify-between gap-3">
          <span>✅ {savedMsg}</span>
          <Button variant="subtle" onClick={goToDashboard}>View dashboard</Button>
        </div>
      )}

      <Card>
        <div
          ref={dropRef}
          onDragOver={(e) => {
            e.preventDefault()
            dropRef.current?.classList.add('ring-2')
          }}
          onDragLeave={() => dropRef.current?.classList.remove('ring-2')}
          onDrop={onDrop}
          className="rounded-xl border-2 border-dashed border-black/15 dark:border-white/15 ring-[#2a78d6]/60 p-6 text-center transition"
        >
          <div className="text-3xl mb-2" aria-hidden>📷</div>
          <p className="text-sm text-[#52514e] dark:text-[#c3c2b7]">
            Drag & drop screenshots, <button className="text-[#256abf] font-medium underline" onClick={() => fileInputRef.current?.click()}>browse</button>, or paste (⌘/Ctrl+V)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {images.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-3">
            {images.map((im) => (
              <div key={im.id} className="relative group">
                <img
                  src={im.url}
                  alt="statement screenshot"
                  className="h-24 w-auto rounded-lg border border-black/10 dark:border-white/10 object-cover"
                />
                <button
                  onClick={() => removeImage(im.id)}
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-[#d03b3b] text-white text-xs shadow"
                  aria-label="Remove image"
                >
                  ✕
                </button>
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
          <Button variant="ghost" onClick={() => setShowRaw((v) => !v)}>
            {showRaw ? 'Hide' : 'Paste text instead'}
          </Button>
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
              <Button variant="subtle" onClick={parseFromText} disabled={!rawText.trim()}>Parse text</Button>
            </div>
          </div>
        )}
      </Card>

      {rows.length > 0 && (
        <Card
          title={`Review ${rows.length} detected ${rows.length === 1 ? 'row' : 'rows'}`}
          subtitle="Fix anything OCR got wrong, then save. Uncheck rows to skip them."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={addBlankRow}>+ Add row</Button>
              <Button onClick={save} disabled={!validRows.length}>
                Add {validRows.length} transaction{validRows.length === 1 ? '' : 's'}
              </Button>
            </div>
          }
        >
          {invalidCount > 0 && (
            <p className="mb-2 text-xs text-[#d03b3b]">
              {invalidCount} checked row{invalidCount === 1 ? '' : 's'} still need a valid date and amount.
            </p>
          )}
          <ReviewTable rows={rows} categories={categories} currency={settings.currency} updateRow={updateRow} removeRow={removeRow} />
        </Card>
      )}

      {rows.length === 0 && images.length === 0 && !showRaw && (
        <Card>
          <EmptyState icon="🧾" title="Nothing to review yet">
            Add a screenshot above and press “Read screenshots”, or paste the statement text.
          </EmptyState>
        </Card>
      )}
    </div>
  )
}

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
              <tr
                key={r.id}
                className={
                  'border-t border-black/5 dark:border-white/5 ' +
                  (!r.include ? 'opacity-40 ' : '') +
                  (invalid ? 'bg-[#d03b3b]/5' : '')
                }
              >
                <td className="px-2 py-1.5">
                  <input
                    type="checkbox"
                    checked={r.include}
                    onChange={(e) => updateRow(r.id, { include: e.target.checked })}
                    aria-label="Include row"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <TextInput
                    type="date"
                    value={r.date}
                    onChange={(e) => updateRow(r.id, { date: e.target.value })}
                    className="w-[9.5rem]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <TextInput
                    value={r.description}
                    onChange={(e) => updateRow(r.id, { description: e.target.value })}
                    className="w-full min-w-[10rem]"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Select
                    value={categories.includes(r.category) ? r.category : 'Other'}
                    onChange={(v) => updateRow(r.id, { category: v })}
                    options={categories}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <Select
                    value={r.type}
                    onChange={(v) => updateRow(r.id, { type: v, category: v === 'income' && r.category === 'Other' ? 'Income' : r.category })}
                    options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]}
                  />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <TextInput
                    type="number"
                    step="0.01"
                    min="0"
                    value={r.amount}
                    onChange={(e) => updateRow(r.id, { amount: e.target.value })}
                    className="w-28 text-right tabular-nums"
                  />
                </td>
                <td className="px-2 py-1.5">
                  <button
                    onClick={() => removeRow(r.id)}
                    className="text-[#898781] hover:text-[#d03b3b] px-1"
                    aria-label="Delete row"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
