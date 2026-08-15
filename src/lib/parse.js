// Turn raw OCR text (or pasted statement text) into candidate transactions.
// This is deliberately forgiving: it extracts a best guess for each line and
// relies on the review table for the human to correct mistakes before saving.

import { matchDateToken } from './date.js'

// A monetary amount: requires cents (.dd) so we don't grab dates or quantities.
// Captures optional $ , thousands separators, and negative markers ( ) or -.
const AMOUNT_RX = /\(?-?\$?\s?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}\)?-?/g

// Lines that are almost never a transaction — skip them outright.
const NOISE_RX = /(statement|account\s*(number|summary)|available\s*(bal|credit)|previous\s*balance|new\s*balance|beginning\s*balance|ending\s*balance|total\s*(for|of|payments|purchases)?|minimum\s*payment|payment\s*due|page\s*\d|posted|transaction\s*date|description\s*amount|balance\b|^\s*date\s|customer\s*service|www\.|\.com\b\s*$)/i

let idCounter = 0
function nextId() {
  idCounter += 1
  return `t_${Date.now().toString(36)}_${idCounter}`
}

function parseAmount(token) {
  const negative = /^\(|\)$|-/.test(token.trim())
  const num = parseFloat(token.replace(/[^0-9.]/g, ''))
  if (Number.isNaN(num)) return null
  return { value: Math.abs(num), negative }
}

// Income/credit signals in a line (a refund, deposit, or CC payment).
const CREDIT_RX = /(payment\s*(thank\s*you|received|-\s*thank)|refund|deposit|credit\b|reversal|cashback|direct\s*dep|payroll|salary|interest\s*paid|dividend)/i

export function parseTransactions(rawText, opts = {}) {
  const { defaultYear = new Date().getFullYear() } = opts
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const out = []

  for (const line of lines) {
    if (NOISE_RX.test(line)) continue

    const amountTokens = line.match(AMOUNT_RX)
    if (!amountTokens || amountTokens.length === 0) continue

    // Heuristic: the last money-like token on the line is usually the amount.
    // (Statements that also print a running balance are the ambiguous case; the
    // reviewer can fix those.)
    const amtToken = amountTokens[amountTokens.length - 1]
    const parsed = parseAmount(amtToken)
    if (!parsed || parsed.value === 0) continue

    const dateMatch = matchDateToken(line, defaultYear)
    const date = dateMatch?.iso || ''

    // Description = the line with the matched date and money tokens stripped.
    let desc = line
    if (dateMatch) desc = desc.replace(dateMatch.raw, ' ')
    for (const t of amountTokens) desc = desc.replace(t, ' ')
    desc = desc.replace(/\s+/g, ' ').replace(/^[-–—•*:\s]+|[-–—•*:\s]+$/g, '').trim()
    if (!desc) desc = '(no description)'

    const isCredit = parsed.negative || CREDIT_RX.test(line)

    out.push({
      id: nextId(),
      date: date || '',
      description: desc,
      amount: parsed.value,
      type: isCredit ? 'income' : 'expense',
      include: true, // whether this row is selected for import
    })
  }

  return out
}

export function blankRow() {
  return {
    id: nextId(),
    date: '',
    description: '',
    amount: 0,
    type: 'expense',
    include: true,
  }
}
