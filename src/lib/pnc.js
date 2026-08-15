// Parse the text of a PNC personal bank statement (checking / Virtual Wallet /
// spend account) into transactions.
//
// PNC statements group activity under labeled sections, and the section tells us
// whether a line is money in or money out — far more reliable than guessing from
// the description. A typical layout, one row per transaction, is:
//
//   Deposits and Other Additions
//   Date     Amount     Description
//   08/12    1,234.56   Direct Deposit - ACME PAYROLL
//
//   Banking/Debit Card Withdrawals and Purchases
//   08/13    42.19      POS PURCHASE AMAZON.COM
//
// We walk the lines top-to-bottom, tracking the current section to assign
// income/expense, pull the date + amount out of each transaction row, and fold
// wrapped description lines into the row above them. It's deliberately forgiving:
// anything it gets wrong is fixable in the review table before saving/exporting.

import { matchDateToken } from './date.js'

// Amount with cents, optionally $-prefixed / thousands-separated / parenthesized.
const AMOUNT_RX = /\(?-?\$?\s?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}\)?-?/
const AMOUNT_RX_G = new RegExp(AMOUNT_RX.source, 'g')
// A row starts with a PNC date token: MM/DD or MM/DD/YY(YY).
const ROW_START_RX = /^\s*(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\b/

// Section headers → the type every row under them should get. Ordered so the
// first match on a header line wins. type 'skip' marks non-transaction sections
// (running-balance tables, summaries) whose dated rows must be ignored.
const SECTIONS = [
  // Non-transactional — a date+amount here is a daily balance, not activity.
  { rx: /daily\s+balance\s+detail/i, type: 'skip' },
  { rx: /balance\s+summary/i, type: 'skip' },
  { rx: /(activity|account|transaction)\s+summary/i, type: 'skip' },
  { rx: /overdraft\s+and\s+returned/i, type: 'skip' },
  { rx: /interest\s+summary/i, type: 'skip' },
  // Money in
  { rx: /deposits?\s+and\s+other\s+additions/i, type: 'income' },
  { rx: /\badditions?\b/i, type: 'income' },
  { rx: /interest\s+(payment|paid|earned)/i, type: 'income' },
  // Money out
  { rx: /(banking\/?(debit|check)\s*card|debit\s*card).*(withdrawals|purchases)/i, type: 'expense' },
  { rx: /withdrawals?\s+and\s+purchases/i, type: 'expense' },
  { rx: /online\s+and\s+electronic\s+banking\s+deductions/i, type: 'expense' },
  { rx: /checks?\s+and\s+substitute\s+checks?/i, type: 'expense' },
  { rx: /other\s+deductions/i, type: 'expense' },
  { rx: /(service\s+)?(charges|fees)\s+and\s+other\s+deductions/i, type: 'expense' },
  { rx: /\bdeductions?\b/i, type: 'expense' },
  { rx: /\bfees?\b/i, type: 'expense' },
  { rx: /\bwithdrawals?\b/i, type: 'expense' },
]

// Lines that live inside a section but are not transactions (totals, column
// headers, page furniture) — skip them without ending the section.
const SKIP_RX = /^(date\b|amount\b|description\b|reference\b|transaction\b|there\s+(were|was)\b|total\s|continued\b|page\s+\d|balance\b|beginning\s+balance|ending\s+balance)/i

// A header line that clearly starts a section but on its own row.
function sectionFor(line) {
  // Only treat short, label-like lines (no transaction amount) as headers, so a
  // description mentioning "fees" doesn't flip the section.
  if (ROW_START_RX.test(line) || AMOUNT_RX.test(line)) return null
  for (const s of SECTIONS) if (s.rx.test(line)) return s.type
  return null
}

// Income-ish keywords, used only as a fallback when we're outside any known
// section (some PNC layouts run activity together).
const CREDIT_RX = /(deposit|credit|refund|reversal|interest\s+paid|direct\s+dep|payroll|cashback|dividend)/i

let idc = 0
const nextId = () => `pnc_${Date.now().toString(36)}_${idc++}`

function parseAmount(token) {
  const negative = /^\(|\)$|^-|-$/.test(token.trim())
  const num = parseFloat(token.replace(/[^0-9.]/g, ''))
  if (Number.isNaN(num)) return null
  return { value: Math.abs(num), negative }
}

export function parsePncStatement(rawText, opts = {}) {
  const { defaultYear = new Date().getFullYear() } = opts
  const lines = String(rawText || '')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)

  const out = []
  let currentType = null // 'income' | 'expense' | null
  let last = null // last emitted row, for folding wrapped description lines

  for (const line of lines) {
    const sect = sectionFor(line)
    if (sect) {
      currentType = sect
      last = null
      continue
    }

    const startsRow = ROW_START_RX.test(line)

    if (!startsRow) {
      if (SKIP_RX.test(line)) { last = null; continue }
      // Continuation of the previous transaction's description (PNC wraps long
      // merchant strings onto the next line).
      if (currentType !== 'skip' && last && !AMOUNT_RX.test(line) && line.length <= 60) {
        last.description = `${last.description} ${line}`.replace(/\s+/g, ' ').trim()
      }
      continue
    }

    if (currentType === 'skip') { last = null; continue }

    const amounts = line.match(AMOUNT_RX_G)
    if (!amounts || !amounts.length) { last = null; continue }

    const dateMatch = matchDateToken(line, defaultYear)
    if (!dateMatch) { last = null; continue }

    // In PNC's sectioned layout the transaction amount is the first money token
    // after the date (any later token is a running balance).
    const amtToken = amounts[0]
    const amt = parseAmount(amtToken)
    if (!amt || amt.value === 0) { last = null; continue }

    // Description = the line minus the leading date and the amount tokens.
    let desc = line.slice(dateMatch.raw.length ? line.indexOf(dateMatch.raw) + dateMatch.raw.length : 0)
    desc = desc.replace(amtToken, ' ')
    desc = desc.replace(/\s+/g, ' ').replace(/^[-–—•*:\s]+|[-–—•*:\s]+$/g, '').trim()
    if (!desc) desc = '(no description)'

    let type = currentType
    if (!type) type = (amt.negative || CREDIT_RX.test(line)) ? 'income' : 'expense'
    // A parenthesized/negative amount in a deposits section is a reversal, etc.
    if (currentType === 'income' && amt.negative) type = 'expense'

    const row = {
      id: nextId(),
      date: dateMatch.iso,
      description: desc,
      amount: amt.value,
      type,
      include: true,
    }
    out.push(row)
    last = row
  }

  return out
}
