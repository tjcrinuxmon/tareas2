import React, { useState, useEffect, useCallback } from 'react'
import { getTasks, markDailyReport, getMyDailyReports } from '../api.js'
import { DIRECCIONES, STATUS_CONFIG, PRIORITY_CONFIG, formatDate, localToday } from '../constants.js'
import TaskCard from './TaskCard.jsx'

export default function TaskList({ filters, onFilterChange, onTaskClick, onNewTask, user }) {
  const restricted = user?.role === 'director' || user?.role === 'subdirector'
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [todayReportSol,  setTodayReportSol]  = useState(null)
  const [todayReportConc, setTodayReportConc] = useState(null)
  const [savingReportSol,  setSavingReportSol]  = useState(false)
  const [savingReportConc, setSavingReportConc] = useState(false)

  const today = localToday()

  useEffect(() => {
    if (user?.role !== 'subdirector' && user?.role !== 'director') return
    getMyDailyReports().then(rows => {
      setTodayReportSol(rows.find(r => r.report_date === today && r.report_type === 'solicitudes') || null)
      setTodayReportConc(rows.find(r => r.report_date === today && r.report_type === 'conclusiones') || null)
    }).catch(() => {})
  }, [user, today])

  const hasAltaToday = tasks.some(
    t => t.priority === 'alta' && t.week_date === today
  )

  const hasCompletedAltaToday = tasks.some(
    t => t.priority === 'alta' && t.closed_at === today
  )

  const handleMarkNoSolicitudes = async () => {
    setSavingReportSol(true)
    try {
      await markDailyReport('sin_reporte', today, 'solicitudes')
      setTodayReportSol({ report_date: today, report_type: 'solicitudes', status: 'sin_reporte' })
    } finally { setSavingReportSol(false) }
  }

  const handleMarkNoConclusiones = async () => {
    setSavingReportConc(true)
    try {
      await markDailyReport('sin_reporte', today, 'conclusiones')
      setTodayReportConc({ report_date: today, report_type: 'conclusiones', status: 'sin_reporte' })
    } finally { setSavingReportConc(false) }
  }

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTasks({
        direccion:  filters.direccion  || undefined,
        status:     filters.status     || undefined,
        date_from:  filters.date_from  || undefined,
        date_to:    filters.date_to    || undefined,
        priority:   filters.priority   || undefined,
      })
      setTasks(data)
    } catch {
      setError('Error al cargar las tareas. Verifica que el servidor esté activo.')
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => { fetchTasks() }, [fetchTasks])

  const handleDateFromChange  = (e) => onFilterChange({ date_from: e.target.value })
  const handleDateToChange    = (e) => onFilterChange({ date_to:   e.target.value })
  const handleStatusChange    = (e) => onFilterChange({ status:    e.target.value })
  const handleDireccionChange = (e) => onFilterChange({ direccion: e.target.value })
  const handlePriorityChange  = (e) => onFilterChange({ priority:  e.target.value })

  const clearFilters = () =>
    onFilterChange({ direccion: '', status: '', date_from: '', date_to: '', priority: '' })

  const hasActiveFilters = filters.direccion || filters.status || filters.priority || filters.date_from || filters.date_to

  // Tasks assigned to users from multiple different areas
  const multiAreaTasks = !restricted && !filters.direccion
    ? tasks.filter(t => (t.assignee_area_count || 0) > 1)
    : []

  // For restricted users: tasks assigned to them from other areas, or multi-area tasks
  const crossAreaTasks = restricted && !filters.direccion
    ? tasks.filter(t => t.direccion !== user?.direccion || (t.assignee_area_count || 0) > 1)
    : []

  const grouped = !filters.direccion
    ? DIRECCIONES.map((dir) => ({
        dir,
        // Exclude multi-area tasks from area sections; restricted users only see their own area
        tasks: tasks.filter((t) =>
          t.direccion === dir.key &&
          (t.assignee_area_count || 0) <= 1 &&
          (!restricted || t.direccion === user?.direccion)
        ),
      })).filter((g) => g.tasks.length > 0)
    : null
  const activeDir = filters.direccion ? DIRECCIONES.find((d) => d.key === filters.direccion) : null

  return (
    <div className="fade-in max-w-7xl mx-auto">
      {/* Page header */}
      <div
        className="bg-white rounded-xl mb-5 px-5 py-4"
        style={{ borderLeft: '5px solid #582E73', border: '1.5px solid #E2D9EE', borderLeft: '5px solid #582E73', boxShadow: '0 2px 8px rgba(88,46,115,.07)' }}
      >
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-ine-text">
              {activeDir ? activeDir.fullLabel : 'Todas las Tareas'}
            </h2>
            <p className="text-xs text-ine-muted mt-0.5 flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {filters.date_from && filters.date_to
                ? `${formatDate(filters.date_from)} — ${formatDate(filters.date_to)}`
                : filters.date_from
                  ? `Desde ${formatDate(filters.date_from)}`
                  : filters.date_to
                    ? `Hasta ${formatDate(filters.date_to)}`
                    : 'Todas las fechas'}
              <span className="mx-1 text-ine-border">•</span>
              {tasks.length} tarea{tasks.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onNewTask} className="btn-ine">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Tarea
          </button>
        </div>
      </div>

      {/* Reporte diario — solo directores y subdirectores */}
      {(user?.role === 'subdirector' || user?.role === 'director') && (
        <div className="bg-white rounded-xl mb-4 px-4 py-3 flex items-start justify-between gap-4 flex-wrap"
          style={{ border: '1.5px solid #E2D9EE', boxShadow: '0 1px 4px rgba(88,46,115,.05)' }}>
          <p className="text-sm font-semibold text-ine-text self-center">Reporte diario</p>
          <div className="flex gap-3 flex-wrap">
            {/* Botón solicitudes */}
            <div className="flex items-center gap-2">
              {todayReportSol || hasAltaToday
                ? <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background:'#D1FAE5', color:'#065F46' }}>
                    {hasAltaToday ? '✓ Hay solicitudes registradas hoy' : '✓ Sin solicitudes (Reporte/SR)'}
                  </span>
                : <button onClick={handleMarkNoSolicitudes} disabled={savingReportSol}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
                    style={{ borderColor:'#F59E0B', color:'#92400E', background:'#FFFBEB' }}>
                    {savingReportSol ? 'Guardando...' : 'Sin asuntos relevantes'}
                  </button>
              }
            </div>
            {/* Botón conclusiones */}
            <div className="flex items-center gap-2">
              {todayReportConc || hasCompletedAltaToday
                ? <span className="text-xs font-medium px-3 py-1.5 rounded-lg" style={{ background:'#D1FAE5', color:'#065F46' }}>
                    {hasCompletedAltaToday ? '✓ Hay cierres reportados hoy' : '✓ Sin cierres (Reporte/SR)'}
                  </span>
                : <button onClick={handleMarkNoConclusiones} disabled={savingReportConc}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
                    style={{ borderColor:'#10B981', color:'#065F46', background:'#ECFDF5' }}>
                    {savingReportConc ? 'Guardando...' : 'Sin asuntos relevantes concluidos'}
                  </button>
              }
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="ine-card mb-5">
        {/* Mobile filter toggle */}
        <button
          className="md:hidden w-full flex items-center justify-between px-4 py-3"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-ine-muted uppercase tracking-wide">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filtros
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#582E73' }} />
            )}
          </div>
          <svg className={`w-4 h-4 text-ine-dim transition-transform ${filtersOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Filter controls */}
        <div className={`p-4 ${filtersOpen ? 'block' : 'hidden'} md:block`} style={{ borderTop: filtersOpen ? '1px solid #EDE8F4' : undefined }}>
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
              <input type="date" value={filters.date_from || ''} onChange={handleDateFromChange}
                className="ine-input" style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }} />
            </div>

            <div className="flex items-center gap-2">
              <label className="ine-label mb-0">Hasta:</label>
              <input type="date" value={filters.date_to || ''} onChange={handleDateToChange}
                className="ine-input" style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }} />
            </div>

            {!restricted && (
              <div className="flex items-center gap-2">
                <label className="ine-label mb-0">Dirección:</label>
                <select value={filters.direccion || ''} onChange={handleDireccionChange}
                  className="ine-input" style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}>
                  <option value="">Todas</option>
                  {DIRECCIONES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
                </select>
              </div>
            )}

            <div className="flex items-center gap-2">
              <label className="ine-label mb-0">Estado:</label>
              <select value={filters.status || ''} onChange={handleStatusChange}
                className="ine-input" style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}>
                <option value="">Todos</option>
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="ine-label mb-0">Prioridad:</label>
              <select value={filters.priority || ''} onChange={handlePriorityChange}
                className="ine-input" style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}>
                <option value="">Todas</option>
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                  <option key={k} value={k}>{v.icon} {v.label}</option>
                ))}
              </select>
            </div>

            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs font-semibold transition-colors" style={{ color: '#DC2626' }}
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
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 rounded-full animate-spin mb-4"
               style={{ borderColor: '#E2D9EE', borderTopColor: '#582E73' }} />
          <p className="text-ine-muted text-sm">Cargando tareas...</p>
        </div>
      ) : error ? (
        <div className="ine-card p-8 text-center" style={{ border: '1.5px solid rgba(220,38,38,.22)' }}>
          <p className="font-semibold mb-2" style={{ color: '#B91C1C' }}>{error}</p>
          <button onClick={fetchTasks} className="text-sm text-ine-purple underline">Reintentar</button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="ine-card p-16 text-center">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#F8F5FB' }}>
            <svg className="w-7 h-7 text-ine-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="font-bold text-ine-text mb-1">No hay tareas registradas</h3>
          <p className="text-sm text-ine-muted mb-5">
            {hasActiveFilters ? 'No se encontraron tareas con los filtros seleccionados.' : 'Empieza creando la primera tarea.'}
          </p>
          <button onClick={onNewTask} className="btn-ine">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva Tarea
          </button>
        </div>
      ) : grouped ? (
        <div className="space-y-7">
          {/* Multi-area section — admin/ejecutiva only */}
          {multiAreaTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#7C3AED' }} />
                <h3 className="text-sm font-bold text-ine-text">Asignación Multi-área</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(124,58,237,.12)', color: '#7C3AED' }}>
                  {multiAreaTasks.length}
                </span>
                <div className="flex-1 h-px bg-ine-border" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {multiAreaTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
                ))}
              </div>
            </div>
          )}

          {/* Regular area sections */}
          {grouped.map(({ dir, tasks: dirTasks }) => (
            <div key={dir.key}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: dir.color }} />
                <h3 className="text-sm font-bold text-ine-text">{dir.label}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: dir.color + '18', color: dir.color }}>
                  {dirTasks.length}
                </span>
                <div className="flex-1 h-px bg-ine-border" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {dirTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
                ))}
              </div>
            </div>
          ))}

          {/* Cross-area section — restricted users (director/subdirector) */}
          {crossAreaTasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#0891B2' }} />
                <h3 className="text-sm font-bold text-ine-text">Turnos recibidos de otras áreas</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(8,145,178,.12)', color: '#0891B2' }}>
                  {crossAreaTasks.length}
                </span>
                <div className="flex-1 h-px bg-ine-border" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {crossAreaTasks.map((task) => (
                  <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div>
          {activeDir && (
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: activeDir.color }} />
              <h3 className="text-sm font-bold text-ine-text">{activeDir.fullLabel}</h3>
              <div className="flex-1 h-px bg-ine-border" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
