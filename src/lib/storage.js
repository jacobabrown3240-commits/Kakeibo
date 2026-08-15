// Local-first persistence. Everything lives in the browser's localStorage so no
// financial data ever leaves the device. Export/import (see export.js) is the
// path for backups and moving between devices.

import { DEFAULT_CATEGORIES } from './categorize.js'

const KEY = 'kakeibo.state.v1'

export const DEFAULT_STATE = {
  version: 1,
  transactions: [],
  categories: DEFAULT_CATEGORIES,
  settings: {
    currency: 'USD',
    weekStartsOn: 1, // Monday
    monthlyIncome: 0, // optional expected income used as a fallback on the dashboard
    theme: 'system', // 'light' | 'dark' | 'system'
  },
  // Per-category weekly spending targets, e.g. { Groceries: 150 }.
  weeklyBudgets: {},
}

function reviveState(parsed) {
  if (!parsed || typeof parsed !== 'object') return { ...DEFAULT_STATE }
  return {
    ...DEFAULT_STATE,
    ...parsed,
    settings: { ...DEFAULT_STATE.settings, ...(parsed.settings || {}) },
    categories:
      Array.isArray(parsed.categories) && parsed.categories.length
        ? parsed.categories
        : DEFAULT_STATE.categories,
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    weeklyBudgets: parsed.weeklyBudgets && typeof parsed.weeklyBudgets === 'object'
      ? parsed.weeklyBudgets
      : {},
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
