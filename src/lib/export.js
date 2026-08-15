// Backup helpers: full-state JSON export/import and a transactions CSV export.

import { DEFAULT_STATE } from './storage.js'
import { isValidISO } from './date.js'

function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function stamp() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}`
}

export function exportJSON(state) {
  download(`kakeibo-backup-${stamp()}.json`, JSON.stringify(state, null, 2), 'application/json')
}

function csvField(v) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function exportCSV(transactions) {
  const header = ['date', 'description', 'type', 'amount']
  const rows = [...transactions]
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
    .map((t) => [t.date, t.description, t.type, t.amount.toFixed(2)].map(csvField).join(','))
  download(`kakeibo-transactions-${stamp()}.csv`, [header.join(','), ...rows].join('\n'), 'text/csv')
}

// Export review rows (from any importer — PDF, OCR, CSV) to a CSV file, before
// they're saved into the app. Only rows kept (included) with a usable amount are
// written; invalid dates are left as-is so the file mirrors what you reviewed.
export function exportReviewCSV(rows, filename) {
  const header = ['date', 'description', 'type', 'amount']
  const body = rows
    .filter((r) => r.include !== false && Number(r.amount) > 0)
    .map((r) => [r.date || '', r.description || '', r.type || 'expense', Number(r.amount).toFixed(2)])
    .map((cells) => cells.map(csvField).join(','))
  const name = filename || `pnc-transactions-${stamp()}.csv`
  download(name, [header.join(','), ...body].join('\n'), 'text/csv')
  return body.length
}

// Validate + normalize an imported JSON backup into a usable state object.
export function parseImportedJSON(text) {
  const parsed = JSON.parse(text)
  if (!parsed || typeof parsed !== 'object') throw new Error('Not a valid backup file.')
  const txns = Array.isArray(parsed.transactions) ? parsed.transactions : []
  const clean = txns
    .filter((t) => t && isValidISO(t.date) && typeof t.amount === 'number' && !Number.isNaN(t.amount))
    .map((t, i) => ({
      id: t.id || `imp_${Date.now().toString(36)}_${i}`,
      date: t.date,
      description: String(t.description || '').slice(0, 200),
      amount: Math.abs(Number(t.amount)),
      type: t.type === 'income' ? 'income' : 'expense',
    }))
  return {
    ...DEFAULT_STATE,
    ...parsed,
    settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
    transactions: clean,
  }
}
