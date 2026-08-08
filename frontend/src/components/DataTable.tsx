import React, { useState, useEffect } from 'react'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'

interface Column<T> {
  key: string
  label: string
  render?: (row: T) => React.ReactNode
  sortable?: boolean
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  loading?: boolean
  searchable?: boolean
  searchPlaceholder?: string
  onSearch?: (q: string) => void
  total?: number
  page?: number
  perPage?: number
  onPageChange?: (page: number) => void
  actions?: (row: T) => React.ReactNode
  title?: string
  headerRight?: React.ReactNode
}

export function DataTable<T extends { id: number }>({
  data, columns, loading, searchable, searchPlaceholder = 'Search…',
  onSearch, total = 0, page = 1, perPage = 10, onPageChange,
  actions, title, headerRight,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const totalPages = Math.ceil(total / perPage)

  useEffect(() => {
    const t = setTimeout(() => onSearch?.(search), 400)
    return () => clearTimeout(t)
  }, [search])

  return (
    <div className="table-wrapper">
      {(title || searchable || headerRight) && (
        <div className="table-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            {title && <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>{title}</h3>}
            {searchable && (
              <div className="search-bar" style={{ maxWidth: 280 }}>
                <Search size={16} color="var(--text-muted)" />
                <input
                  placeholder={searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            )}
          </div>
          {headerRight}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              {actions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <div className="spinner" /> Loading…
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No records found
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={row.id}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : String((row as any)[col.key] ?? '—')}
                    </td>
                  ))}
                  {actions && <td>{actions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination" style={{ padding: '1rem' }}>
          <button className="page-btn" onClick={() => onPageChange?.(page - 1)} disabled={page <= 1}>
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            const p = i + 1
            return (
              <button key={p} className={`page-btn ${p === page ? 'active' : ''}`} onClick={() => onPageChange?.(p)}>
                {p}
              </button>
            )
          })}
          <button className="page-btn" onClick={() => onPageChange?.(page + 1)} disabled={page >= totalPages}>
            <ChevronRight size={16} />
          </button>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
            {total} total
          </span>
        </div>
      )}
    </div>
  )
}
