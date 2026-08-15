// Date helpers. All transaction dates are stored as ISO 'YYYY-MM-DD' strings.
// Week grouping defaults to Monday-start, which matches most weekly-budget habits.

const MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const pad = (n) => String(n).padStart(2, '0')

export function toISO(year, month, day) {
  return `${year}-${pad(month)}-${pad(day)}`
}

// Find a loose date token in a line of statement text and return both the ISO
// value and the exact substring that matched (so callers can strip precisely).
// Handles: MM/DD, MM/DD/YY, MM/DD/YYYY, M-D, and "Mon DD" / "Mon DD, YYYY".
// `defaultYear` fills in the year when the statement omits it.
export function matchDateToken(text, defaultYear) {
  if (!text) return null
  const year = defaultYear || new Date().getFullYear()

  // Numeric: 8/12, 08/12/24, 8-12-2024. Scan all candidates and take the first
  // that is a real calendar-ish date (skips things like "23.40" that look
  // numeric but aren't valid months/days).
  const numRx = /\b(\d{1,2})[/\-.](\d{1,2})(?:[/\-.](\d{2,4}))?\b/g
  let m
  while ((m = numRx.exec(text))) {
    const mo = parseInt(m[1], 10)
    const day = parseInt(m[2], 10)
    let yr = m[3] ? parseInt(m[3], 10) : year
    if (yr < 100) yr += 2000
    if (mo >= 1 && mo <= 12 && day >= 1 && day <= 31) return { iso: toISO(yr, mo, day), raw: m[0] }
  }

  // Textual: Aug 12, August 12, Aug 12 2024, Aug 12, 2024
  const txtRx = /\b([A-Za-z]{3,9})\.?\s+(\d{1,2})(?:,?\s+(\d{4}))?\b/g
  while ((m = txtRx.exec(text))) {
    const key = m[1].toLowerCase()
    const mo = MONTHS[key.slice(0, key.startsWith('sept') ? 4 : 3)]
    const day = parseInt(m[2], 10)
    const yr = m[3] ? parseInt(m[3], 10) : year
    if (mo && day >= 1 && day <= 31) return { iso: toISO(yr, mo, day), raw: m[0] }
  }

  return null
}

// Convenience wrapper returning just the ISO string (or null).
export function parseLooseDate(text, defaultYear) {
  return matchDateToken(text, defaultYear)?.iso ?? null
}

export function isValidISO(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s))
}

// Build a Date at local midnight from an ISO string (avoids TZ drift).
export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function monthKey(iso) {
  return iso.slice(0, 7) // 'YYYY-MM'
}

export function monthLabel(mk) {
  const [y, m] = mk.split('-').map(Number)
  return `${MONTH_NAMES[m - 1]} ${y}`
}

// Monday-start week. Returns the ISO date of that week's Monday.
export function weekStartISO(iso, weekStartsOn = 1) {
  const d = fromISO(iso)
  const day = d.getDay() // 0=Sun..6=Sat
  const diff = (day - weekStartsOn + 7) % 7
  d.setDate(d.getDate() - diff)
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

export function weekEndISO(iso, weekStartsOn = 1) {
  const start = fromISO(weekStartISO(iso, weekStartsOn))
  start.setDate(start.getDate() + 6)
  return toISO(start.getFullYear(), start.getMonth() + 1, start.getDate())
}

export function shortDate(iso) {
  const d = fromISO(iso)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export function weekRangeLabel(weekStart) {
  const s = fromISO(weekStart)
  const e = fromISO(weekEndISO(weekStart))
  const sameMonth = s.getMonth() === e.getMonth()
  const fmt = (d, withMonth) =>
    withMonth ? `${MONTH_NAMES[d.getMonth()].slice(0, 3)} ${d.getDate()}` : `${d.getDate()}`
  return `${fmt(s, true)} – ${fmt(e, !sameMonth)}`
}

export function todayISO() {
  const d = new Date()
  return toISO(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

export function currentMonthKey() {
  return todayISO().slice(0, 7)
}
