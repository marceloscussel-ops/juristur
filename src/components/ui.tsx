// components/ui/index.tsx
// Juristur Design System — Componentes React
// Uso: import { Button, Badge, Card, Alert, Input, Table } from '@/components/ui'

import React from 'react'

/* ─── TIPOS ─── */
type Size = 'sm' | 'md' | 'lg'
type Variant = 'primary' | 'gold' | 'outline' | 'ghost' | 'danger'
type BadgeVariant = 'navy' | 'gold' | 'teal' | 'success' | 'danger' | 'slate'
type AlertVariant = 'info' | 'success' | 'warning' | 'danger'


/* ═══════════════════════════════
   BUTTON
═══════════════════════════════ */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: boolean
  loading?: boolean
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon = false,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base = 'btn'
  const variantClass = `btn-${variant}`
  const sizeClass = size !== 'md' ? `btn-${size}` : ''
  const iconClass = icon ? 'btn-icon' : ''

  return (
    <button
      className={`${base} ${variantClass} ${sizeClass} ${iconClass} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
      ) : children}
    </button>
  )
}


/* ═══════════════════════════════
   BADGE
═══════════════════════════════ */
interface BadgeProps {
  variant?: BadgeVariant
  dot?: boolean
  children: React.ReactNode
  className?: string
}

export function Badge({ variant = 'teal', dot = false, children, className = '' }: BadgeProps) {
  return (
    <span className={`badge badge-${variant} ${className}`}>
      {dot && (
        <span
          className="w-[5px] h-[5px] rounded-full bg-current opacity-80 flex-shrink-0"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

/* Status map para processos jurídicos */
export const statusBadge: Record<string, { variant: BadgeVariant; label: string }> = {
  ativo:      { variant: 'teal',    label: 'Em andamento' },
  pendente:   { variant: 'gold',    label: 'Pendente' },
  concluido:  { variant: 'success', label: 'Concluído' },
  urgente:    { variant: 'navy',    label: 'Urgente' },
  vencido:    { variant: 'danger',  label: 'Prazo vencido' },
  rascunho:   { variant: 'slate',   label: 'Rascunho' },
}

export function StatusBadge({ status }: { status: keyof typeof statusBadge }) {
  const s = statusBadge[status]
  if (!s) return null
  return <Badge variant={s.variant} dot>{s.label}</Badge>
}


/* ═══════════════════════════════
   AREA TAG (tag colorida por área do direito)
═══════════════════════════════ */
const areaColors: Record<string, string> = {
  civel:         'bg-[#EEF6FF] text-[#185FA5]',
  tributario:    'bg-gold-muted text-[#8A5C1A]',
  trabalhista:   'bg-teal-muted text-teal',
  contratual:    'bg-[#EAF5ED] text-success',
  criminal:      'bg-[#FDF2F1] text-[#8A2B1F]',
  administrativo:'bg-surface text-slate',
  previdenciario:'bg-[#F0EBF8] text-[#5B3A8A]',
  consumidor:    'bg-[#FFF3E0] text-[#B05A00]',
}

export function AreaTag({ area, className = '' }: { area: string; className?: string }) {
  const label = area.charAt(0).toUpperCase() + area.slice(1)
  const colors = areaColors[area.toLowerCase()] ?? 'bg-surface text-slate'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${colors} ${className}`}>
      {label}
    </span>
  )
}


/* ═══════════════════════════════
   CARD
═══════════════════════════════ */
interface CardProps {
  accent?: 'gold' | 'teal' | 'none'
  children: React.ReactNode
  className?: string
}

export function Card({ accent = 'none', children, className = '' }: CardProps) {
  const accentClass = accent === 'gold' ? 'j-card-gold' : accent === 'teal' ? 'j-card-teal' : 'j-card'
  return <div className={`${accentClass} ${className}`}>{children}</div>
}


/* ═══════════════════════════════
   STAT CARD
═══════════════════════════════ */
interface StatCardProps {
  value: string | number
  label: string
  trend?: string
  trendUp?: boolean
}

export function StatCard({ value, label, trend, trendUp }: StatCardProps) {
  return (
    <div className="j-stat">
      <div className="j-stat-value">{value}</div>
      <div className="j-stat-label">{label}</div>
      {trend && (
        <div className={`text-[11px] font-medium mt-1.5 ${trendUp ? 'text-success' : 'text-danger'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </div>
      )}
    </div>
  )
}


/* ═══════════════════════════════
   ALERT
═══════════════════════════════ */
const alertIcons: Record<AlertVariant, React.ReactNode> = {
  info: (
    <svg className="w-4 h-4 shrink-0 mt-px" viewBox="0 0 20 20" fill="#1B7B8A">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/>
    </svg>
  ),
  success: (
    <svg className="w-4 h-4 shrink-0 mt-px" viewBox="0 0 20 20" fill="#1A7A4A">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4 shrink-0 mt-px" viewBox="0 0 20 20" fill="#B8922A">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
    </svg>
  ),
  danger: (
    <svg className="w-4 h-4 shrink-0 mt-px" viewBox="0 0 20 20" fill="#C0392B">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
    </svg>
  ),
}

interface AlertProps {
  variant?: AlertVariant
  title?: string
  children: React.ReactNode
  className?: string
}

export function Alert({ variant = 'info', title, children, className = '' }: AlertProps) {
  return (
    <div className={`j-alert j-alert-${variant} ${className}`} role="alert">
      {alertIcons[variant]}
      <div>
        {title && <div className="font-semibold mb-0.5">{title}</div>}
        {children}
      </div>
    </div>
  )
}


/* ═══════════════════════════════
   INPUT
═══════════════════════════════ */
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  success?: boolean
  mono?: boolean
}

export function Input({
  label,
  hint,
  error,
  success,
  mono,
  className = '',
  id,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const stateClass = error ? 'j-input-error' : success ? 'j-input-success' : ''
  const monoClass = mono ? 'font-mono text-[13px]' : ''

  return (
    <div className="w-full">
      {label && <label className="j-label" htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        className={`j-input ${stateClass} ${monoClass} ${className}`}
        {...props}
      />
      {error && <p className="j-hint j-hint-error">{error}</p>}
      {!error && hint && <p className="j-hint">{hint}</p>}
    </div>
  )
}


/* ═══════════════════════════════
   SELECT
═══════════════════════════════ */
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  options: { value: string; label: string }[]
}

export function Select({ label, hint, options, className = '', id, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="w-full">
      {label && <label className="j-label" htmlFor={selectId}>{label}</label>}
      <select
        id={selectId}
        className={`j-input appearance-none bg-no-repeat ${className}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%234A5568' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundPosition: 'right 12px center',
          paddingRight: '36px',
        }}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {hint && <p className="j-hint">{hint}</p>}
    </div>
  )
}


/* ═══════════════════════════════
   TEXTAREA
═══════════════════════════════ */
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export function Textarea({ label, hint, error, className = '', id, ...props }: TextareaProps) {
  const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="w-full">
      {label && <label className="j-label" htmlFor={textareaId}>{label}</label>}
      <textarea
        id={textareaId}
        className={`j-input j-textarea ${error ? 'j-input-error' : ''} ${className}`}
        {...props}
      />
      {error && <p className="j-hint j-hint-error">{error}</p>}
      {!error && hint && <p className="j-hint">{hint}</p>}
    </div>
  )
}


/* ═══════════════════════════════
   TABLE
═══════════════════════════════ */
interface Column<T> {
  key: keyof T | string
  header: string
  render?: (row: T) => React.ReactNode
  align?: 'left' | 'right' | 'center'
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  emptyMessage?: string
  onRowClick?: (row: T) => void
}

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  emptyMessage = 'Nenhum resultado encontrado.',
  onRowClick,
}: TableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="j-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} style={{ textAlign: col.align ?? 'left' }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-8 text-slate-light">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={String(row[keyField])}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? 'cursor-pointer' : ''}
              >
                {columns.map((col) => (
                  <td key={String(col.key)} style={{ textAlign: col.align ?? 'left' }}>
                    {col.render
                      ? col.render(row)
                      : String(row[col.key as keyof T] ?? '—')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}


/* ═══════════════════════════════
   CHIP (filtros)
═══════════════════════════════ */
interface ChipProps {
  active?: boolean
  onRemove?: () => void
  onClick?: () => void
  children: React.ReactNode
}

export function Chip({ active, onRemove, onClick, children }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`j-chip ${active ? 'j-chip-active' : ''}`}
    >
      {children}
      {onRemove && (
        <span
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="opacity-50 hover:opacity-100 leading-none"
          aria-label="Remover filtro"
        >
          ×
        </span>
      )}
    </button>
  )
}


/* ═══════════════════════════════
   SECTION HEADER
═══════════════════════════════ */
interface SectionHeaderProps {
  overline?: string
  title: string
  action?: React.ReactNode
}

export function SectionHeader({ overline, title, action }: SectionHeaderProps) {
  return (
    <div className="j-section-header">
      <div>
        {overline && <p className="j-overline">{overline}</p>}
        <h2 className="j-h2 mt-0.5">{title}</h2>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}


/* ═══════════════════════════════
   NAV BAR
═══════════════════════════════ */
interface NavItem {
  href: string
  label: string
  active?: boolean
}

interface NavBarProps {
  items: NavItem[]
  userName?: string
  userInitials?: string
  onNewProcess?: () => void
}

export function NavBar({ items, userName, userInitials, onNewProcess }: NavBarProps) {
  return (
    <nav className="j-nav" aria-label="Navegação principal">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 bg-gold rounded-[4px]" aria-hidden="true" />
        <span className="font-display text-[18px] text-white">Juristur</span>
      </div>

      {/* Links */}
      <ul className="flex gap-0.5 list-none m-0 p-0">
        {items.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className={`j-nav-link ${item.active ? 'j-nav-link-active' : ''}`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>

      {/* Ações */}
      <div className="flex items-center gap-2">
        {onNewProcess && (
          <Button variant="gold" size="sm" onClick={onNewProcess}>
            + Novo processo
          </Button>
        )}
        {userInitials && (
          <div
            className="w-8 h-8 rounded-full bg-gold flex items-center justify-center
                       text-white text-[12px] font-semibold select-none"
            title={userName}
            aria-label={`Usuário: ${userName}`}
          >
            {userInitials}
          </div>
        )}
      </div>
    </nav>
  )
}


/* ═══════════════════════════════
   DIVIDER
═══════════════════════════════ */
export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`j-divider ${className}`} />
}


/* ═══════════════════════════════
   NÚMERO DE PROCESSO (formatado CNJ)
═══════════════════════════════ */
export function ProcessNumber({ value }: { value: string }) {
  return (
    <span className="font-mono text-[12px] text-teal">{value}</span>
  )
}
