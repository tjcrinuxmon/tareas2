import React, { useState, useEffect } from 'react'
import { getTasks } from '../api.js'
import { DIRECCIONES, STATUS_CONFIG, PRIORITY_CONFIG, formatDate, localToday } from '../constants.js'

const TODAY = localToday()

function isOverdue(task) {
  return task.week_date && task.week_date < TODAY && task.status !== 'completada'
}

export default function AssignmentTracker() {
  const [tasks, setTasks]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState(null)
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo]     = useState('')
  const [filterDir, setFilterDir]       = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    setLoading(true)
    setError(null)
    getTasks({
      date_from:  dateFrom   || undefined,
      date_to:    dateTo     || undefined,
      direccion:  filterDir  || undefined,
      status:     filterStatus || undefined,
    })
      .then((data) => { setTasks(data.filter((t) => t.assigned_to)); setLoading(false) })
      .catch(() => { setError('Error al cargar las asignaciones.'); setLoading(false) })
  }, [dateFrom, dateTo, filterDir, filterStatus])

  const total       = tasks.length
  const pendiente   = tasks.filter((t) => t.status === 'pendiente').length
  const en_progreso = tasks.filter((t) => t.status === 'en_progreso').length
  const completada  = tasks.filter((t) => t.status === 'completada').length
  const vencidas    = tasks.filter(isOverdue).length

  const grouped = DIRECCIONES
    .filter((dir) => !filterDir || dir.key === filterDir)
    .map((dir) => {
      const dirTasks = tasks.filter((t) => t.direccion === dir.key)
      if (!dirTasks.length) return null
      const byAssignee = {}
      for (const task of dirTasks) {
        const key = String(task.assigned_to)
        if (!byAssignee[key]) byAssignee[key] = { name: task.assigned_to_name || '—', tasks: [] }
        byAssignee[key].tasks.push(task)
      }
      return { dir, assignees: Object.values(byAssignee) }
    })
    .filter(Boolean)

  return (
    <div className="fade-in max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-xl mb-5 px-5 py-4"
           style={{ borderLeft: '5px solid #582E73', border: '1.5px solid #E2D9EE', borderLeft: '5px solid #582E73', boxShadow: '0 2px 8px rgba(88,46,115,.07)' }}>
        <h2 className="text-lg font-bold text-ine-text">Seguimiento de Asignaciones</h2>
        <p className="text-xs text-ine-muted mt-0.5">Tareas asignadas por área y responsable</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total',       value: total,       color: '#582E73', bg: '#F8F5FB' },
          { label: 'Pendientes',  value: pendiente,   color: '#D97706', bg: '#FFFBEB' },
          { label: 'En progreso', value: en_progreso, color: '#2563EB', bg: '#EFF6FF' },
          { label: 'Completadas', value: completada,  color: '#16A34A', bg: '#F0FDF4' },
          { label: 'Vencidas',    value: vencidas,    color: '#DC2626', bg: '#FEF2F2' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className="rounded-xl px-4 py-3 text-center"
               style={{ background: bg, border: `1px solid ${color}22` }}>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
            <p className="text-xs font-semibold mt-0.5" style={{ color }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="ine-card p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="hidden md:flex items-center gap-1.5 text-xs font-bold text-ine-muted uppercase tracking-wide">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros:
          </div>

          <div className="flex items-center gap-2">
            <label className="ine-label mb-0">Desde:</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="ine-input" style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }} />
          </div>
          <div className="flex items-center gap-2">
            <label className="ine-label mb-0">Hasta:</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="ine-input" style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }} />
          </div>

          <div className="flex items-center gap-2">
            <label className="ine-label mb-0">Dirección:</label>
            <select value={filterDir} onChange={(e) => setFilterDir(e.target.value)}
              className="ine-input" style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}>
              <option value="">Todas</option>
              {DIRECCIONES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="ine-label mb-0">Estado:</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
              className="ine-input" style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}>
              <option value="">Todos</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          {(dateFrom || dateTo || filterDir || filterStatus) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setFilterDir(''); setFilterStatus('') }}
              className="flex items-center gap-1 text-xs font-semibold transition-colors"
              style={{ color: '#DC2626' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#B91C1C'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#DC2626'}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 rounded-full animate-spin mb-4"
               style={{ borderColor: '#E2D9EE', borderTopColor: '#582E73' }} />
          <p className="text-ine-muted text-sm">Cargando asignaciones...</p>
        </div>
      ) : error ? (
        <div className="ine-card p-8 text-center" style={{ border: '1.5px solid rgba(220,38,38,.22)' }}>
          <p className="font-semibold" style={{ color: '#B91C1C' }}>{error}</p>
        </div>
      ) : grouped.length === 0 ? (
        <div className="ine-card p-16 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#F8F5FB' }}>
            <svg className="w-7 h-7 text-ine-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="font-bold text-ine-text mb-1">Sin asignaciones</h3>
          <p className="text-sm text-ine-muted">No hay tareas asignadas con los filtros seleccionados.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(({ dir, assignees }) => (
            <div key={dir.key}>
              {/* Área header */}
              <div className="flex items-center gap-2.5 mb-4">
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: dir.color }} />
                <h3 className="text-sm font-black text-ine-text uppercase tracking-wide">{dir.fullLabel}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: dir.color + '18', color: dir.color }}>
                  {assignees.reduce((s, a) => s + a.tasks.length, 0)} tarea{assignees.reduce((s, a) => s + a.tasks.length, 0) !== 1 ? 's' : ''}
                </span>
                <div className="flex-1 h-px" style={{ background: dir.color + '30' }} />
              </div>

              {/* Assignees in this area */}
              <div className="space-y-4 pl-5">
                {assignees.map(({ name, tasks: assigneeTasks }) => {
                  const done = assigneeTasks.filter((t) => t.status === 'completada').length
                  const pct  = Math.round((done / assigneeTasks.length) * 100)
                  const hasOverdue = assigneeTasks.some(isOverdue)

                  return (
                    <div key={name} className="ine-card overflow-hidden">
                      {/* Assignee header */}
                      <div className="px-5 py-3 flex items-center gap-3"
                           style={{ background: dir.color + '08', borderBottom: '1px solid #EDE8F4' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                             style={{ background: dir.color }}>
                          {name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-ine-text truncate">{name}</p>
                          <p className="text-xs text-ine-dim">{assigneeTasks.length} tarea{assigneeTasks.length !== 1 ? 's' : ''} asignada{assigneeTasks.length !== 1 ? 's' : ''}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {hasOverdue && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                  style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                              Vencida{assigneeTasks.filter(isOverdue).length > 1 ? 's' : ''}
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-1.5 rounded-full overflow-hidden" style={{ background: '#E2D9EE' }}>
                              <div className="h-full rounded-full transition-all"
                                   style={{ width: `${pct}%`, background: pct === 100 ? '#16A34A' : dir.color }} />
                            </div>
                            <span className="text-xs font-semibold" style={{ color: pct === 100 ? '#16A34A' : dir.color }}>
                              {pct}%
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Task rows */}
                      <div className="divide-y" style={{ borderColor: '#EDE8F4' }}>
                        {assigneeTasks.map((task) => {
                          const st  = STATUS_CONFIG[task.status]  || STATUS_CONFIG.pendiente
                          const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media
                          const overdue = isOverdue(task)
                          const taskPct = task.latest_percentage ?? 0

                          return (
                            <div key={task.id} className="px-5 py-3 flex flex-wrap items-center gap-3">
                              {/* Status dot */}
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: st.color }} />

                              {/* Title */}
                              <span className="text-sm font-medium text-ine-text flex-1 min-w-0 truncate">
                                {task.title}
                              </span>

                              {/* Priority */}
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                                    style={{ background: pri.bg, color: pri.color }}>
                                {pri.icon} {pri.label}
                              </span>

                              {/* Status badge */}
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                                    style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                                {st.label}
                              </span>

                              {/* Due date */}
                              <span className="text-xs flex-shrink-0 flex items-center gap-1"
                                    style={{ color: overdue ? '#DC2626' : '#6B5F78', fontWeight: overdue ? 600 : 400 }}>
                                {overdue && (
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                                {formatDate(task.week_date)}
                              </span>

                              {/* Progress bar */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#E2D9EE' }}>
                                  <div className="h-full rounded-full"
                                       style={{ width: `${taskPct}%`, background: taskPct === 100 ? '#16A34A' : st.color }} />
                                </div>
                                <span className="text-xs text-ine-dim w-7 text-right">{taskPct}%</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
