import { useEffect, useMemo, useState, useCallback } from 'react'
import { loadState, saveState, DEFAULT_STATE } from './lib/storage.js'
import { useTheme } from './lib/theme.js'
import Dashboard from './views/Dashboard.jsx'
import CalendarView from './views/CalendarView.jsx'
import ImportView from './views/ImportView.jsx'
import TransactionsView from './views/TransactionsView.jsx'
import SettingsView from './views/SettingsView.jsx'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'calendar', label: 'Calendar', icon: '📅' },
  { id: 'import', label: 'Import', icon: '📷' },
  { id: 'transactions', label: 'Transactions', icon: '🧾' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

export default function App() {
  const [state, setState] = useState(() => loadState())
  const [tab, setTab] = useState('dashboard')
  const { dark, chrome } = useTheme(state.settings.theme)

  // Persist on every change.
  useEffect(() => {
    saveState(state)
  }, [state])

  const addTransactions = useCallback((rows) => {
    setState((s) => ({ ...s, transactions: [...s.transactions, ...rows] }))
  }, [])

  const updateTransaction = useCallback((id, patch) => {
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }))
  }, [])

  const deleteTransaction = useCallback((id) => {
    setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }))
  }, [])

  const deleteMany = useCallback((ids) => {
    const set = new Set(ids)
    setState((s) => ({ ...s, transactions: s.transactions.filter((t) => !set.has(t.id)) }))
  }, [])

  const patch = useCallback((updater) => setState((s) => ({ ...s, ...updater(s) })), [])

  const replaceState = useCallback((next) => setState(next), [])
  const clearAll = useCallback(() => setState({ ...DEFAULT_STATE }), [])

  const txnCount = state.transactions.length

  const view = useMemo(() => {
    const common = { state, dark, chrome }
    switch (tab) {
      case 'calendar':
        return <CalendarView {...common} goImport={() => setTab('import')} />
      case 'import':
        return (
          <ImportView
            {...common}
            addTransactions={addTransactions}
            goToDashboard={() => setTab('dashboard')}
          />
        )
      case 'transactions':
        return (
          <TransactionsView
            {...common}
            updateTransaction={updateTransaction}
            deleteTransaction={deleteTransaction}
            deleteMany={deleteMany}
            goImport={() => setTab('import')}
          />
        )
      case 'settings':
        return (
          <SettingsView
            {...common}
            patch={patch}
            replaceState={replaceState}
            clearAll={clearAll}
          />
        )
      default:
        return <Dashboard {...common} goImport={() => setTab('import')} />
    }
  }, [tab, state, dark, chrome, addTransactions, updateTransaction, deleteTransaction, deleteMany, patch, replaceState, clearAll])

  return (
    <div className="min-h-full bg-[#f9f9f7] dark:bg-[#0d0d0d] text-[#0b0b0b] dark:text-white">
      <header className="sticky top-0 z-20 backdrop-blur bg-[#f9f9f7]/85 dark:bg-[#0d0d0d]/85 border-b border-black/10 dark:border-white/10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex items-center gap-3 h-14">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>🪙</span>
              <span className="font-semibold tracking-tight">Kakeibo</span>
              <span className="hidden sm:inline text-xs text-[#898781] ml-1">weekly budgeting</span>
            </div>
            <nav className="ml-auto flex items-center gap-1">
              {TABS.map((t) => {
                const active = tab === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition ' +
                      (active
                        ? 'bg-[#256abf] text-white'
                        : 'text-[#52514e] dark:text-[#c3c2b7] hover:bg-black/5 dark:hover:bg-white/10')
                    }
                    aria-current={active ? 'page' : undefined}
                  >
                    <span className="mr-1" aria-hidden>{t.icon}</span>
                    <span className="hidden sm:inline">{t.label}</span>
                    {t.id === 'transactions' && txnCount > 0 && (
                      <span className="ml-1.5 text-xs opacity-70">({txnCount})</span>
                    )}
                  </button>
                )
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-6">{view}</main>

      <footer className="mx-auto max-w-6xl px-4 sm:px-6 py-8 text-xs text-[#898781]">
        Your data lives only in this browser. Export a backup from Settings to keep it safe.
      </footer>
    </div>
  )
}
