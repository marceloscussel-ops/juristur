// components/ui.tsx
// Juristur Design System V2
// import { Button, Badge, Card, Alert, Input, Select, Textarea, Table, Chip, StatusBadge, AreaTag, StatCard, ProcessNumber, SectionHeader, Divider } from '@/components/ui'

import React from 'react'

/* ─── TIPOS ─── */
type BtnVariant   = 'primary' | 'accent' | 'warm' | 'outline' | 'ghost' | 'danger'
type BtnSize      = 'sm' | 'md' | 'lg'
type BadgeVariant = 'ink' | 'indigo' | 'amber' | 'teal' | 'success' | 'danger' | 'muted'
type AlertVariant = 'info' | 'success' | 'warning' | 'danger'
type CardAccent   = 'gradient' | 'amber' | 'none'


/* ═══════════════════════════════
   BUTTON
═══════════════════════════════ */
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
  icon?: boolean
  loading?: boolean
}

export function Button({
  variant = 'accent',
  size = 'md',
  icon = false,
  loading = false,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const classes = [
    'btn',
    `btn-${variant}`,
    size !== 'md' ? `btn-${size}` : '',
    icon ? 'btn-icon' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading ? (
        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
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
      {dot && <span className="badge-dot" aria-hidden="true" />}
      {children}
    </span>
  )
}

export const processStatusMap: Record<string, { variant: BadgeVariant; label: string }> = {
  em_analise: { variant: 'amber',   label: 'Em análise' },
  concluido:  { variant: 'success', label: 'Concluído' },
  arquivado:  { variant: 'muted',   label: 'Arquivado' },
}

export function StatusBadge({ status }: { status: string }) {
  const s = processStatusMap[status] ?? processStatusMap.em_analise
  return <Badge variant={s.variant} dot>{s.label}</Badge>
}


/* ═══════════════════════════════
   AREA TAG
═══════════════════════════════ */
const areaStyles: Record<string, string> = {
  civel:          'bg-[#EEF6FF] text-[#1D4ED8]',
  tributario:     'bg-amber-pale text-[#7C420E]',
  trabalhista:    'bg-teal-pale text-teal',
  contratual:     'bg-[#F0FDF4] text-[#166534]',
  criminal:       'bg-[#FEF2F2] text-[#991B1B]',
  administrativo: 'bg-surface text-ink-40',
  previdenciario: 'bg-[#FAF5FF] text-[#6B21A8]',
  consumidor:     'bg-[#FFF7ED] text-[#C2410C]',
  empresarial:    'bg-indigo-pale text-indigo',
}

export function AreaTag({ area, className = '' }: { area: string; className?: string }) {
  const key    = area.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  const styles = areaStyles[key] ?? 'bg-surface text-ink-40'
  const label  = area.charAt(0).toUpperCase() + area.slice(1)
  return <span className={`area-tag ${styles} ${className}`}>{label}</span>
}


/* ═══════════════════════════════
   CARD
═══════════════════════════════ */
interface CardProps {
  accent?: CardAccent
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ accent = 'none', children, className = '', onClick }: CardProps) {
  const accentClass = accent === 'gradient' ? 'j-card-gradient' : accent === 'amber' ? 'j-card-amber' : ''
  return (
    <div
      className={`j-card ${accentClass} ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {children}
    </div>
  )
}


/* ═══════════════════════════════
   STAT CARD
═══════════════════════════════ */
interface StatCardProps {
  value: string | number
  label: string
  trend?: string
  trendUp?: boolean
  danger?: boolean
}

export function StatCard({ value, label, trend, trendUp, danger }: StatCardProps) {
  return (
    <div className="j-stat">
      <div className={`j-stat-value ${danger ? 'text-danger' : ''}`}>{value}</div>
      <div className="j-stat-label">{label}</div>
      {trend && (
        <div className={`text-[11px] font-medium mt-2 ${trendUp ? 'text-success' : 'text-danger'}`}>
          {trendUp ? '↑' : '↓'} {trend}
        </div>
      )}
    </div>
  )
}


/* ═══════════════════════════════
   PROCESS NUMBER
═══════════════════════════════ */
export function ProcessNumber({ value }: { value: string }) {
  return <span className="j-proc-number">{value}</span>
}


/* ═══════════════════════════════
   ALERT
═══════════════════════════════ */
const alertIcons: Record<AlertVariant, React.ReactNode> = {
  info: (
    <svg className="w-[18px] h-[18px] shrink-0 mt-px" viewBox="0 0 20 20" fill="#0E7490">
      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
    </svg>
  ),
  success: (
    <svg className="w-[18px] h-[18px] shrink-0 mt-px" viewBox="0 0 20 20" fill="#16A34A">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg className="w-[18px] h-[18px] shrink-0 mt-px" viewBox="0 0 20 20" fill="#D97706">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  ),
  danger: (
    <svg className="w-[18px] h-[18px] shrink-0 mt-px" viewBox="0 0 20 20" fill="#DC2626">
      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
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
        {title && <div className="j-alert-title">{title}</div>}
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

export function Input({ label, hint, error, success, mono, className = '', id, ...props }: InputProps) {
  const inputId    = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const stateClass = error ? 'j-input-error' : success ? 'j-input-success' : ''
  const monoClass  = mono ? 'font-mono text-[13px] tracking-[0.02em]' : ''

  return (
    <div className="w-full">
      {label && <label className="j-label" htmlFor={inputId}>{label}</label>}
      <input
        id={inputId}
        className={`j-input ${stateClass} ${monoClass} ${className}`}
        {...props}
      />
      {error    && <p className="j-hint j-hint-error">{error}</p>}
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
        className={`j-input appearance-none cursor-pointer ${className}`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%230D0D1A' stroke-width='2' stroke-opacity='0.4'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 14px center',
          paddingRight: '40px',
        }}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
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
      {error    && <p className="j-hint j-hint-error">{error}</p>}
      {!error && hint && <p className="j-hint">{hint}</p>}
    </div>
  )
}


/* ═══════════════════════════════
   TABLE
═══════════════════════════════ */
interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  align?: 'left' | 'right' | 'center'
  width?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyField: keyof T
  emptyMessage?: string
  onRowClick?: (row: T) => void
  loading?: boolean
}

export function Table<T extends Record<string, unknown>>({
  columns, data, keyField, emptyMessage = 'Nenhum resultado.', onRowClick, loading,
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-ink-40 text-[13px]">
        <svg className="animate-spin w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        Carregando...
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="j-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={{ textAlign: col.align ?? 'left', width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="text-center py-10 text-ink-40">
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
                  <td key={col.key} style={{ textAlign: col.align ?? 'left' }}>
                    {col.render ? col.render(row) : String(row[col.key as keyof T] ?? '—')}
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
   CHIP
═══════════════════════════════ */
interface ChipProps {
  active?: boolean
  onRemove?: () => void
  onClick?: () => void
  children: React.ReactNode
  className?: string
}

export function Chip({ active, onRemove, onClick, children, className = '' }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`j-chip ${active ? 'j-chip-active' : ''} ${className}`}
    >
      {children}
      {onRemove && (
        <span
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="opacity-40 hover:opacity-80 leading-none"
          aria-label="Remover"
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
  className?: string
}

export function SectionHeader({ overline, title, action, className = '' }: SectionHeaderProps) {
  return (
    <div className={`j-section-header ${className}`}>
      <div>
        {overline && <p className="j-overline mb-0.5">{overline}</p>}
        <h2 className="j-h2 m-0">{title}</h2>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}


/* ═══════════════════════════════
   DIVIDER
═══════════════════════════════ */
export function Divider({ className = '' }: { className?: string }) {
  return <hr className={`j-divider ${className}`} />
}
