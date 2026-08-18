// Local-first persistence. Everything lives in the browser's localStorage so no
// financial data ever leaves the device. Export/import (see export.js) is the
// path for backups and moving between devices.
//
// Transactions are just { id, date, description, amount, type } where type is
// 'income' | 'expense' — no categories.

const KEY = 'kakeibo.state.v1'

export const DEFAULT_STATE = {
  version: 2,
  transactions: [],
  settings: {
    currency: 'USD',
    weekStartsOn: 1, // Monday
    // Your balance as of now. The trend is anchored so its latest point equals
    // this and earlier weeks are computed backward from it. null = not set
    // (trend then just runs cumulatively from 0).
    currentBalance: null,
    // The income line each week's spending is measured against. null = not set,
    // in which case the dashboard falls back to your average weekly income.
    expectedWeeklyIncome: null,
    theme: 'system', // 'light' | 'dark' | 'system'
  },
}

// Normalize a transaction, dropping any legacy fields (e.g. category).
function reviveTxn(t, i) {
  return {
    id: t.id || `t_${Date.now().toString(36)}_${i}`,
    date: t.date,
    description: String(t.description || ''),
    amount: Math.abs(Number(t.amount) || 0),
    type: t.type === 'income' ? 'income' : 'expense',
  }
}

function reviveState(parsed) {
  if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_STATE }
  return {
    ...DEFAULT_STATE,
    ...parsed,
    settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions.map(reviveTxn) : [],
  }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULT_STATE }
    return reviveState(JSON.parse(raw))
  } catch (e) {
    console.warn('Failed to load state, starting fresh:', e)
    return { ...DEFAULT_STATE }
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    return true
  } catch (e) {
    console.error('Failed to save state:', e)
    return false
  }
}

export function clearState() {
  try {
    localStorage.removeItem(KEY)
  } catch (e) {
    console.error('Failed to clear state:', e)
  }
}
