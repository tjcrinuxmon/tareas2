import React, { useState, useEffect } from 'react'
import { getTasksStats, getTasks } from '../api.js'
import { DIRECCIONES, formatDate, localToday } from '../constants.js'

function DimLabel({ children }) {
  return (
    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: '#9CA3AF' }}>
      {children}
    </p>
  )
}

function StatCard({ label, value, color, bg, onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-xl px-5 py-4 flex flex-col gap-1 transition-transform hover:scale-[1.02] w-full"
      style={{ background: bg, border: `1.5px solid ${color}30` }}
    >
      <span className="text-3xl font-bold" style={{ color }}>{value ?? '—'}</span>
      <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: color + 'cc' }}>{label}</span>
    </button>
  )
}

export default function Dashboard({ user, onNavigate, onFilterChange }) {
  const [stats, setStats]               = useState(null)
  const [urgentes, setUrgentes]         = useState([])
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingUrgentes, setLoadingUrgentes] = useState(true)

  useEffect(() => {
    getTasksStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoadingStats(false))

    getTasks({ status: 'vencida', limit: 5, hideCompleted: 'true' })
      .then(r => setUrgentes(Array.isArray(r) ? r : (r?.tasks ?? [])))
      .catch(() => {})
      .finally(() => setLoadingUrgentes(false))
  }, [])

  const addDays = (base, n) => {
    const d = new Date(base + 'T12:00:00')
    d.setDate(d.getDate() + n)
    return localToday(d)
  }

  const goToTasks = (statusFilter) => {
    const today = localToday()
    if (statusFilter === 'por_vencer') {
      onFilterChange({ status: '', direccion: '', date_from: today, date_to: addDays(today, 2), priority: '' })
    } else if (statusFilter === 'a_tiempo') {
      onFilterChange({ status: '', direccion: '', date_from: addDays(today, 3), date_to: '', priority: '' })
    } else {
      onFilterChange({ status: statusFilter || '', direccion: '', date_from: '', date_to: '', priority: '' })
    }
  }

  const skeleton = (n) =>
    Array.from({ length: n }).map((_, i) => (
      <div key={i} className="rounded-xl px-5 py-4 animate-pulse" style={{ background: '#F8F5FB', height: 88 }} />
    ))

  return (
    <div className="fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div
        className="bg-white rounded-xl mb-6 px-5 py-4"
        style={{ borderLeft: '5px solid #582E73', border: '1.5px solid #E2D9EE', borderLeft: '5px solid #582E73', boxShadow: '0 2px 8px rgba(88,46,115,.07)' }}
      >
        <h2 className="text-lg font-bold text-ine-text">Panel General</h2>
        <p className="text-xs text-ine-muted mt-0.5">Resumen de actividades · INE · DEAJ</p>
      </div>

      {/* Por tiempo */}
      <DimLabel>Por tiempo</DimLabel>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {loadingStats ? skeleton(3) : (
          <>
            <StatCard label="Vencidas"   value={stats?.vencida}    color="#DC2626" bg="#FEF2F2" onClick={() => goToTasks('vencida')} />
            <StatCard label="Por vencer" value={stats?.por_vencer} color="#D97706" bg="#FFFBEB" onClick={() => goToTasks('por_vencer')} />
            <StatCard label="A tiempo"   value={stats?.a_tiempo}   color="#047857" bg="#F0FDF4" onClick={() => goToTasks('a_tiempo')} />
          </>
        )}
      </div>

      {/* Por estado */}
      <DimLabel>Por estado</DimLabel>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {loadingStats ? skeleton(3) : (
          <>
            <StatCard label="Pendientes"  value={stats?.pendiente}  color="#6B7280" bg="#F9FAFB" onClick={() => goToTasks('pendiente')} />
            <StatCard label="En Progreso" value={stats?.en_progreso} color="#1D4ED8" bg="#EFF6FF" onClick={() => goToTasks('en_progreso')} />
            <StatCard label="Completadas" value={stats?.completada}  color="#047857" bg="#F0FDF4" onClick={() => goToTasks('completada')} />
          </>
        )}
      </div>

      {/* Vencidas recientes */}
      {(loadingUrgentes || urgentes.length > 0) && (
        <div
          className="bg-white rounded-xl mb-6"
          style={{ border: '1.5px solid #FCA5A5', boxShadow: '0 2px 8px rgba(220,38,38,.06)' }}
        >
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #FEE2E2' }}>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              <span className="text-sm font-bold text-ine-text">Vencidas recientes</span>
            </div>
            <button className="text-xs font-semibold underline" style={{ color: '#DC2626' }} onClick={() => goToTasks('vencida')}>
              Ver todas
            </button>
          </div>
          <div className="divide-y divide-red-50">
            {loadingUrgentes ? (
              <div className="flex justify-center py-8">
                <div className="w-7 h-7 border-4 rounded-full animate-spin" style={{ borderColor: '#FEE2E2', borderTopColor: '#DC2626' }} />
              </div>
            ) : (
              urgentes.map(t => {
                const dir = DIRECCIONES.find(d => d.key === t.direccion)
                return (
                  <div key={t.id} className="px-5 py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ine-text truncate">{t.title}</p>
                      <p className="text-xs text-ine-muted mt-0.5">
                        {dir?.label || t.direccion} · Semana: {formatDate(t.week_date)}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#FEE2E2', color: '#DC2626' }}>
                      Vencida
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* Acceso rápido */}
      <div className="flex gap-3 flex-wrap">
        <button className="btn-ine" onClick={() => goToTasks('todos')}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Ver todas las tareas
        </button>
        <button
          className="text-sm font-semibold px-4 py-2 rounded-lg border transition-colors"
          style={{ borderColor: '#E2D9EE', color: '#582E73', background: '#fff' }}
          onClick={() => onNavigate('new-task')}
        >
          + Nueva Tarea
        </button>
      </div>
    </div>
  )
}
