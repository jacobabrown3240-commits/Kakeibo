// Small, dependency-free UI primitives shared across views. Tailwind classes
// carry both light and dark styling.

export function Card({ title, subtitle, actions, children, className = '' }) {
  return (
    <section
      className={
        'rounded-2xl border border-black/10 dark:border-white/10 bg-[#fcfcfb] dark:bg-[#1a1a19] ' +
        'shadow-sm ' + className
      }
    >
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
          <div>
            {title && (
              <h2 className="text-sm font-semibold text-[#0b0b0b] dark:text-white">{title}</h2>
            )}
            {subtitle && (
              <p className="text-xs text-[#52514e] dark:text-[#c3c2b7] mt-0.5">{subtitle}</p>
            )}
          </div>
          {actions}
        </header>
      )}
      <div className="px-5 pb-5 pt-1">{children}</div>
    </section>
  )
}

export function Button({ variant = 'default', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ' +
    'transition disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 ' +
    'focus-visible:ring-[#2a78d6]/60'
  const variants = {
    default:
      'bg-[#256abf] text-white hover:bg-[#1c5cab] active:bg-[#184f95]',
    subtle:
      'bg-black/5 dark:bg-white/10 text-[#0b0b0b] dark:text-white hover:bg-black/10 dark:hover:bg-white/20',
    ghost:
      'text-[#52514e] dark:text-[#c3c2b7] hover:bg-black/5 dark:hover:bg-white/10',
    danger:
      'bg-[#d03b3b] text-white hover:bg-[#b93636]',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function StatTile({ label, value, hint, tone = 'default' }) {
  const toneClass = {
    default: 'text-[#0b0b0b] dark:text-white',
    good: 'text-[#006300] dark:text-[#0ca30c]',
    bad: 'text-[#d03b3b] dark:text-[#e66767]',
  }[tone]
  return (
    <div className="rounded-xl border border-black/10 dark:border-white/10 bg-[#fcfcfb] dark:bg-[#1a1a19] px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-[#898781]">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="text-xs text-[#52514e] dark:text-[#c3c2b7] mt-0.5">{hint}</div>}
    </div>
  )
}

export function Select({ value, onChange, options, className = '', ...props }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={
        'rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#111] ' +
        'text-sm text-[#0b0b0b] dark:text-white px-2.5 py-1.5 focus:outline-none ' +
        'focus-visible:ring-2 focus-visible:ring-[#2a78d6]/60 ' + className
      }
      {...props}
    >
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value
        const label = typeof o === 'string' ? o : o.label
        return (
          <option key={val} value={val}>
            {label}
          </option>
        )
      })}
    </select>
  )
}

export function TextInput({ className = '', ...props }) {
  return (
    <input
      className={
        'rounded-lg border border-black/15 dark:border-white/15 bg-white dark:bg-[#111] ' +
        'text-sm text-[#0b0b0b] dark:text-white px-2.5 py-1.5 focus:outline-none ' +
        'focus-visible:ring-2 focus-visible:ring-[#2a78d6]/60 ' + className
      }
      {...props}
    />
  )
}

export function EmptyState({ icon = '📄', title, children, action }) {
  return (
    <div className="text-center py-12 px-6">
      <div className="text-4xl mb-3" aria-hidden>
        {icon}
      </div>
      <h3 className="text-base font-semibold text-[#0b0b0b] dark:text-white">{title}</h3>
      {children && (
        <p className="mt-1 text-sm text-[#52514e] dark:text-[#c3c2b7] max-w-md mx-auto">{children}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function Badge({ children, color }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {children}
    </span>
  )
}
