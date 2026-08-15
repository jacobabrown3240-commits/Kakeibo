// Parse bank-exported CSV files into transactions. Banks vary wildly in column
// names and sign conventions, so we auto-detect the likely columns and let the
// user confirm/override the mapping before importing.

import { matchDateToken } from './date.js'
import { guessCategory } from './categorize.js'

// RFC-4180-ish CSV parser: handles quoted fields, escaped quotes, and commas /
// newlines inside quotes. Returns an array of rows (arrays of strings).
export function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const s = String(text ?? '').replace(/^﻿/, '') // strip BOM

  for (let i = 0; i < s.length; i++) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"') {
      inQuotes = true
    } else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += c
    }
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  // Drop fully empty rows.
  return rows.filter((r) => r.some((c) => c.trim() !== ''))
}

const DATE_HEADERS = /^(date|transaction date|trans date|posted|posting date|date posted)$/i
const DESC_HEADERS = /^(description|payee|name|memo|details|transaction|merchant|narrative)$/i
const AMOUNT_HEADERS = /^(amount|amt|value|transaction amount)$/i
const DEBIT_HEADERS = /^(debit|withdrawal|withdrawals|money out|paid out)$/i
const CREDIT_HEADERS = /^(credit|deposit|deposits|money in|paid in)$/i
const CATEGORY_HEADERS = /^(category|type)$/i

function looksLikeHeader(row) {
  // A header row rarely contains a parseable date or a currency amount.
  const hasDate = row.some((c) => matchDateToken(c, 2000))
  const hasAmount = row.some((c) => /^-?\$?\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})$/.test(c.trim()))
  return !hasDate && !hasAmount
}

// Guess which columns hold what, from the header row (falls back to positions).
export function detectColumns(headerRow) {
  const find = (rx) => headerRow.findIndex((h) => rx.test(h.trim()))
  return {
    date: find(DATE_HEADERS),
    description: find(DESC_HEADERS),
    amount: find(AMOUNT_HEADERS),
    debit: find(DEBIT_HEADERS),
    credit: find(CREDIT_HEADERS),
    category: find(CATEGORY_HEADERS),
  }
}

function parseAmountCell(cell) {
  if (cell == null) return null
  const raw = String(cell).trim()
  if (!raw) return null
  const negative = /^\(.*\)$/.test(raw) || raw.trim().startsWith('-') || raw.trim().endsWith('-')
  const num = parseFloat(raw.replace(/[^0-9.]/g, ''))
  if (Number.isNaN(num)) return null
  return { value: Math.abs(num), negative }
}

let idc = 0
const nextId = () => `csv_${Date.now().toString(36)}_${idc++}`

// Convert parsed rows into review-ready transactions using a column mapping.
// mapping: { date, description, amount, debit, credit, category } (indices; -1 = none)
// opts: { hasHeader, expenseSign: 'negative'|'positive', categories }
export function csvToTransactions(rows, mapping, opts = {}) {
  const { hasHeader = true, expenseSign = 'negative', categories } = opts
  const body = hasHeader ? rows.slice(1) : rows
  const out = []

  for (const r of body) {
    const dateCell = mapping.date >= 0 ? r[mapping.date] : ''
    const dm = matchDateToken(dateCell || '', new Date().getFullYear())
    const description = (mapping.description >= 0 ? r[mapping.description] : '')?.trim() || '(no description)'

    let value = 0
    let type = 'expense'

    if (mapping.debit >= 0 || mapping.credit >= 0) {
      // Separate debit/credit columns.
      const debit = mapping.debit >= 0 ? parseAmountCell(r[mapping.debit]) : null
      const credit = mapping.credit >= 0 ? parseAmountCell(r[mapping.credit]) : null
      if (debit && debit.value > 0) {
        value = debit.value
        type = 'expense'
      } else if (credit && credit.value > 0) {
        value = credit.value
        type = 'income'
      } else {
        continue
      }
    } else if (mapping.amount >= 0) {
      const amt = parseAmountCell(r[mapping.amount])
      if (!amt || amt.value === 0) continue
      value = amt.value
      // Signed amount: which sign means spending is bank-specific → user choice.
      const isExpense = expenseSign === 'negative' ? amt.negative : !amt.negative
      type = isExpense ? 'expense' : 'income'
    } else {
      continue
    }

    const providedCat = mapping.category >= 0 ? (r[mapping.category] || '').trim() : ''
    const category =
      providedCat && categories?.includes(providedCat)
        ? providedCat
        : guessCategory(description, categories)

    out.push({
      id: nextId(),
      date: dm?.iso || '',
      description,
      amount: value,
      type,
      category: type === 'income' && category === 'Other' ? 'Income' : category,
      include: true,
    })
  }
  return out
}

export { looksLikeHeader }
