import React, { useState, useEffect, useCallback } from 'react'
import { getReport, getTasks } from '../api.js'
import { DIRECCIONES, getMondayOfCurrentWeek, formatWeek, localToday } from '../constants.js'

const today = localToday()

function fmtShort(dateStr) {
  if (!dateStr) return '—'
  const d = new Date((dateStr.includes('T') || dateStr.includes(' ') ? dateStr.replace(' ', 'T') : dateStr + 'T00:00:00'))
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function buildCreatedPDF(tasks, period, win) {
  const completadas = tasks.filter(t => t.closed_at || t.status === 'completada')
  const vencidas    = tasks.filter(t => !t.closed_at && t.status !== 'completada' && t.week_date < today)
  const enTiempo    = tasks.filter(t => !t.closed_at && t.status !== 'completada' && t.week_date >= today)

  const rows = tasks.map(t => {
    const dir  = DIRECCIONES.find(d => d.key === t.direccion)
    const isDone = t.closed_at || t.status === 'completada'
    const isV    = !isDone && t.week_date < today
    const rowBg  = isDone ? '#F0FDF4' : isV ? '#FEF2F2' : ''
    const statusLabel = isDone ? '<span style="color:#047857;font-weight:700">✓ Completada</span>'
                      : isV    ? '<span style="color:#DC2626;font-weight:700">Vencida</span>'
                      :          '<span style="color:#1D4ED8">En tiempo</span>'
    return `<tr style="background:${rowBg}">
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px;color:${dir?.color || '#333'};font-weight:600">${dir?.label || t.direccion}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px">${t.description || t.title}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px;white-space:nowrap">${fmtShort(t.created_at)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px;white-space:nowrap;color:${isV ? '#DC2626' : ''};font-weight:${isV ? '700' : '400'}">${fmtShort(t.week_date)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px;white-space:nowrap">${statusLabel}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Actividades Creadas — INE DEAJ</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #1A1219; padding: 32px; font-size: 13px; }
  .header { border-bottom: 3px solid #582E73; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { font-size: 17px; font-weight: 900; color: #582E73; }
  .brand small { display: block; font-size: 10px; font-weight: 400; color: #6B5F78; margin-top: 2px; }
  .print-date { font-size: 11px; color: #6B5F78; }
  h1 { font-size: 16px; font-weight: 900; color: #1A1219; margin-bottom: 4px; }
  .sub { font-size: 11px; color: #6B5F78; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #2A1239; color: rgba(255,255,255,.85); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 8px 10px; text-align: left; }
  .summary { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 8px; }
  .chip { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #EDE8F4; font-size: 10px; color: #A090B0; text-align: center; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">INE · DEAJ<small>Dirección Ejecutiva de Asuntos Jurídicos</small></div>
    <div class="print-date">Impreso: ${new Date().toLocaleString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
  </div>
  <h1>Actividades Creadas</h1>
  <p class="sub">Período: ${period} — ${tasks.length} actividad${tasks.length !== 1 ? 'es' : ''}</p>
  <table>
    <thead><tr>
      <th>Área</th>
      <th>Descripción</th>
      <th>Fecha de creación</th>
      <th>Fecha de vencimiento</th>
      <th>Estado</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="5" style="padding:14px;text-align:center;color:#6B5F78">Sin actividades en el período seleccionado</td></tr>'}</tbody>
  </table>
  <div class="summary">
    <div class="chip" style="background:#F3EDF9;color:#582E73">Total: ${tasks.length}</div>
    ${completadas.length > 0 ? `<div class="chip" style="background:rgba(5,150,105,.09);color:#047857">Completadas: ${completadas.length}</div>` : ''}
    ${enTiempo.length > 0 ? `<div class="chip" style="background:rgba(29,78,216,.09);color:#1D4ED8">En tiempo: ${enTiempo.length}</div>` : ''}
    ${vencidas.length > 0 ? `<div class="chip" style="background:rgba(220,38,38,.09);color:#DC2626">Vencidas: ${vencidas.length}</div>` : ''}
  </div>
  <div class="footer">Sistema de Seguimiento de Tareas · INE · DEAJ · ${new Date().getFullYear()}</div>
</body>
</html>`

  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

function buildClosedPDF(tasks, period, win) {
  const closed = tasks.filter(t => t.closed_at)
  const onTime = closed.filter(t => t.closed_at <= t.week_date)
  const late   = closed.filter(t => t.closed_at >  t.week_date)

  const rows = closed.map(t => {
    const dir = DIRECCIONES.find(d => d.key === t.direccion)
    const isLate = t.closed_at > t.week_date
    return `<tr style="background:${isLate ? '#FEF2F2' : ''}">
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px;color:${dir?.color || '#333'};font-weight:600">${dir?.label || t.direccion}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px">${t.description || t.title}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px;white-space:nowrap">${fmtShort(t.created_at)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px;white-space:nowrap">${fmtShort(t.week_date)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px;white-space:nowrap;color:${isLate ? '#DC2626' : '#059669'};font-weight:600">${fmtShort(t.closed_at)}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Actividades Cerradas — INE DEAJ</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #1A1219; padding: 32px; font-size: 13px; }
  .header { border-bottom: 3px solid #582E73; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { font-size: 17px; font-weight: 900; color: #582E73; }
  .brand small { display: block; font-size: 10px; font-weight: 400; color: #6B5F78; margin-top: 2px; }
  .print-date { font-size: 11px; color: #6B5F78; }
  h1 { font-size: 16px; font-weight: 900; color: #1A1219; margin-bottom: 4px; }
  .sub { font-size: 11px; color: #6B5F78; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #2A1239; color: rgba(255,255,255,.85); font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; padding: 8px 10px; text-align: left; }
  .summary { display: flex; gap: 20px; flex-wrap: wrap; margin-top: 8px; }
  .chip { padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid #EDE8F4; font-size: 10px; color: #A090B0; text-align: center; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">INE · DEAJ<small>Dirección Ejecutiva de Asuntos Jurídicos</small></div>
    <div class="print-date">Impreso: ${new Date().toLocaleString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
  </div>
  <h1>Actividades Cerradas</h1>
  <p class="sub">Período: ${period} — ${closed.length} actividad${closed.length !== 1 ? 'es' : ''} cerrada${closed.length !== 1 ? 's' : ''}</p>
  <table>
    <thead><tr>
      <th>Área</th>
      <th>Descripción</th>
      <th>Fecha de creación</th>
      <th>Fecha de vencimiento</th>
      <th>Fecha de cierre</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="5" style="padding:14px;text-align:center;color:#6B5F78">Sin actividades cerradas en el período seleccionado</td></tr>'}</tbody>
  </table>
  <div class="summary">
    <div class="chip" style="background:#F3EDF9;color:#582E73">Total cerradas: ${closed.length}</div>
    <div class="chip" style="background:rgba(5,150,105,.09);color:#047857">En tiempo: ${onTime.length}</div>
    ${late.length > 0 ? `<div class="chip" style="background:rgba(220,38,38,.09);color:#DC2626">Fuera de tiempo: ${late.length}</div>` : ''}
  </div>
  <div class="footer">Sistema de Seguimiento de Tareas · INE · DEAJ · ${new Date().getFullYear()}</div>
</body>
</html>`

  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

export default function ReportView({ user }) {
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [weekFilter, setWeekFilter] = useState('')
  const [filterMode, setFilterMode] = useState('all')
  const [generatingPDF, setGeneratingPDF] = useState(false)

  const fetchReport = useCallback(async () => {
    setLoading(true); setError(null)
    try {
      const params = filterMode === 'week' && weekFilter ? { week: weekFilter } : {}
      setStats(await getReport(params))
    } catch { setError('Error al cargar el reporte.') }
    finally { setLoading(false) }
  }, [filterMode, weekFilter])

  useEffect(() => { fetchReport() }, [fetchReport])

  const restricted = user?.role === 'director' || user?.role === 'subdirector'

  const mergedStats = DIRECCIONES
    .filter((dir) => !restricted || dir.key === user.direccion)
    .map((dir) => {
      const found = stats.find((s) => s.direccion === dir.key)
      return {
        dir,
        total:       found?.total       || 0,
        pendiente:   found?.pendiente   || 0,
        en_progreso: found?.en_progreso || 0,
        completada:  found?.completada  || 0,
        vencida:     found?.vencida     || 0,
      }
    })

  const globalTotal      = mergedStats.reduce((a, s) => a + s.total, 0)
  const globalCompletada = mergedStats.reduce((a, s) => a + s.completada, 0)
  const globalPendiente  = mergedStats.reduce((a, s) => a + s.pendiente, 0)
  const globalEnProgreso = mergedStats.reduce((a, s) => a + s.en_progreso, 0)
  const globalVencida    = mergedStats.reduce((a, s) => a + s.vencida, 0)
  const globalPct        = globalTotal > 0 ? Math.round((globalCompletada / globalTotal) * 100) : 0

  const periodLabel = filterMode === 'week' && weekFilter ? formatWeek(weekFilter) : 'Todo el período'

  const weekEnd = (weekFilter) => {
    const d = new Date(weekFilter + 'T12:00:00')
    d.setDate(d.getDate() + 6)
    return localToday(d)
  }

  const handlePDFCreadas = async () => {
    const win = window.open('', '_blank', 'width=1050,height=750')
    if (!win) { alert('El navegador bloqueó la ventana. Permite ventanas emergentes para este sitio.'); return }
    win.document.write('<p style="font-family:Arial;padding:40px;color:#582E73;">Generando reporte…</p>')
    setGeneratingPDF(true)
    try {
      const params = {
        ...(filterMode === 'week' && weekFilter ? { date_from: weekFilter, date_to: weekEnd(weekFilter) } : {}),
        hideCompleted: 'false',
        limit: 10000,
        page: 1,
      }
      const raw = await getTasks(params)
      const tasks = Array.isArray(raw) ? raw : (raw?.tasks ?? [])
      buildCreatedPDF(tasks, periodLabel, win)
    } catch { win.close(); alert('Error al generar el PDF.') }
    finally { setGeneratingPDF(false) }
  }

  const handlePDFCerradas = async () => {
    const win = window.open('', '_blank', 'width=1050,height=750')
    if (!win) { alert('El navegador bloqueó la ventana. Permite ventanas emergentes para este sitio.'); return }
    win.document.write('<p style="font-family:Arial;padding:40px;color:#582E73;">Generando reporte…</p>')
    setGeneratingPDF(true)
    try {
      const params = {
        ...(filterMode === 'week' && weekFilter ? { date_from: weekFilter, date_to: weekEnd(weekFilter) } : {}),
        status: 'completada',
        hideCompleted: 'false',
        limit: 10000,
        page: 1,
      }
      const raw = await getTasks(params)
      const tasks = Array.isArray(raw) ? raw : (raw?.tasks ?? [])
      buildClosedPDF(tasks, periodLabel, win)
    } catch { win.close(); alert('Error al generar el PDF.') }
    finally { setGeneratingPDF(false) }
  }

  return (
    <div className="fade-in max-w-6xl mx-auto">

      {/* Page header */}
      <div className="bg-white rounded-xl mb-5 px-5 py-4"
           style={{ borderLeft: '5px solid #582E73', border: '1.5px solid #E2D9EE', borderLeft: '5px solid #582E73', boxShadow: '0 2px 8px rgba(88,46,115,.07)' }}>
        <h2 className="text-lg font-bold text-ine-text">Reporte de Tareas</h2>
        <p className="text-xs text-ine-muted mt-0.5">Resumen estadístico por Dirección de Área — DEAJ</p>
      </div>

      {/* Filters */}
      <div className="ine-card p-4 mb-5">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="ine-label mb-0">Período:</label>
            <div className="flex rounded-lg overflow-hidden" style={{ border: '1.5px solid #E2D9EE' }}>
              {[
                { key: 'all', label: 'Todo' },
                { key: 'week', label: 'Por semana' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => {
                    setFilterMode(key)
                    if (key === 'week' && !weekFilter) setWeekFilter(getMondayOfCurrentWeek())
                  }}
                  className="px-3 py-1.5 text-sm font-medium transition-colors"
                  style={filterMode === key
                    ? { background: '#582E73', color: 'white' }
                    : { background: 'white', color: '#6B5F78' }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filterMode === 'week' && (
            <div className="flex items-center gap-2">
              <label className="ine-label mb-0">Semana:</label>
              <input
                type="date"
                value={weekFilter}
                onChange={(e) => setWeekFilter(e.target.value)}
                className="ine-input"
                style={{ width: 'auto', padding: '6px 10px', fontSize: '13px' }}
              />
              {weekFilter && <span className="text-xs text-ine-muted">{formatWeek(weekFilter)}</span>}
            </div>
          )}

          <button onClick={fetchReport} className="btn-ine" style={{ padding: '7px 14px', fontSize: '13px' }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>

          <div className="flex-1" />

          {/* PDF buttons */}
          <button
            onClick={handlePDFCreadas}
            disabled={generatingPDF || loading}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'rgba(88,46,115,.07)', border: '1px solid rgba(88,46,115,.22)', color: '#582E73' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            PDF Creadas
          </button>
          <button
            onClick={handlePDFCerradas}
            disabled={generatingPDF || loading}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
            style={{ background: 'rgba(5,150,105,.07)', border: '1px solid rgba(5,150,105,.25)', color: '#047857' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            PDF Cerradas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 rounded-full animate-spin mb-4"
               style={{ borderColor: '#E2D9EE', borderTopColor: '#582E73' }} />
          <p className="text-ine-muted text-sm">Cargando reporte...</p>
        </div>
      ) : error ? (
        <div className="ine-card p-8 text-center" style={{ border: '1.5px solid rgba(220,38,38,.22)' }}>
          <p className="font-semibold" style={{ color: '#B91C1C' }}>{error}</p>
        </div>
      ) : (
        <>
          {/* Global summary cards — solo admin y ejecutiva */}
          {!restricted && <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              label="Total"
              value={globalTotal}
              sub="tareas registradas"
              iconBg="rgba(88,46,115,.09)"
              iconColor="#582E73"
              valueColor="#582E73"
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>}
            />
            <StatCard
              label="Pendientes"
              value={globalPendiente}
              sub={`${globalTotal > 0 ? Math.round((globalPendiente / globalTotal) * 100) : 0}% del total`}
              iconBg="rgba(217,119,6,.10)"
              iconColor="#92400E"
              valueColor="#92400E"
              icon={<div className="w-3 h-3 rounded-full" style={{ background: '#D97706' }} />}
            />
            <StatCard
              label="En Progreso"
              value={globalEnProgreso}
              sub={`${globalTotal > 0 ? Math.round((globalEnProgreso / globalTotal) * 100) : 0}% del total`}
              iconBg="rgba(37,99,235,.09)"
              iconColor="#1D4ED8"
              valueColor="#1D4ED8"
              icon={<div className="w-3 h-3 rounded-full" style={{ background: '#2563EB' }} />}
            />
            <StatCard
              label="Completadas"
              value={globalCompletada}
              sub={`${globalPct}% de avance`}
              iconBg="rgba(5,150,105,.09)"
              iconColor="#047857"
              valueColor="#047857"
              icon={<div className="w-3 h-3 rounded-full" style={{ background: '#059669' }} />}
            />
            <StatCard
              label="Vencidas"
              value={globalVencida}
              sub={`${globalTotal > 0 ? Math.round((globalVencida / globalTotal) * 100) : 0}% del total`}
              iconBg="rgba(220,38,38,.09)"
              iconColor="#DC2626"
              valueColor="#DC2626"
              icon={<div className="w-3 h-3 rounded-full" style={{ background: '#DC2626' }} />}
            />
          </div>}

          {!restricted && globalTotal > 0 && (
            <div className="ine-card p-5 mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-ine-text">Avance Global — DEAJ</p>
                <div className="flex items-center gap-3">
                  {globalVencida > 0 && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(220,38,38,.09)', color: '#DC2626' }}>
                      {globalVencida} vencida{globalVencida !== 1 ? 's' : ''}
                    </span>
                  )}
                  <span className="text-sm font-bold" style={{ color: '#047857' }}>{globalPct}%</span>
                </div>
              </div>
              <div className="h-4 rounded-full overflow-hidden flex" style={{ background: '#EDE8F4' }}>
                {globalCompletada > 0 && <BarSegment pct={(globalCompletada / globalTotal) * 100} color="#059669" title={`Completadas: ${globalCompletada}`} />}
                {globalEnProgreso > 0 && <BarSegment pct={(globalEnProgreso / globalTotal) * 100} color="#2563EB" title={`En Progreso: ${globalEnProgreso}`} />}
                {globalPendiente > 0 && <BarSegment pct={(globalPendiente / globalTotal) * 100} color="#D1C4E9" title={`Pendientes: ${globalPendiente}`} />}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-ine-muted flex-wrap">
                <Legend color="#059669" label="Completadas" />
                <Legend color="#2563EB" label="En Progreso" />
                <Legend color="#D1C4E9" label="Pendientes" />
                {globalVencida > 0 && <Legend color="#DC2626" label="Vencidas (subconjunto de no completadas)" />}
              </div>
            </div>
          )}

          {/* Table */}
          <div className="ine-card overflow-hidden mb-6">
            <div className="px-5 py-4" style={{ borderBottom: '1px solid #EDE8F4' }}>
              <h3 className="text-sm font-bold text-ine-text">Desglose por Dirección de Área</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ background: '#2A1239' }}>
                    {['Dirección','Total','Pendiente','En Progreso','Completada','Vencida','% Avance'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'rgba(255,255,255,.8)', borderRight: '1px solid rgba(255,255,255,.07)' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mergedStats.map(({ dir, total, pendiente, en_progreso, completada, vencida }) => {
                    const pct = total > 0 ? Math.round((completada / total) * 100) : 0
                    return (
                      <tr key={dir.key} style={{ borderBottom: '1px solid #EDE8F4' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#F3EDF9'}
                          onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dir.color }} />
                            <span className="text-sm font-medium text-ine-text">{dir.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-bold" style={{ color: dir.color }}>{total}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge value={pendiente} bg="rgba(217,119,6,.10)" color="#92400E" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge value={en_progreso} bg="rgba(37,99,235,.09)" color="#1D4ED8" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge value={completada} bg="rgba(5,150,105,.09)" color="#047857" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge value={vencida} bg="rgba(220,38,38,.09)" color="#DC2626" />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#EDE8F4' }}>
                              <div className="h-full rounded-full progress-bar-fill"
                                   style={{ width: `${pct}%`, background: dir.color }} />
                            </div>
                            <span className="text-xs font-bold w-9 text-right" style={{ color: dir.color }}>{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visual charts */}
          <div>
            <h3 className="text-sm font-bold text-ine-text mb-4">Distribución Visual por Dirección</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mergedStats.map(({ dir, total, pendiente, en_progreso, completada, vencida }) => {
                const pct = total > 0 ? Math.round((completada / total) * 100) : 0
                return (
                  <div key={dir.key} className="ine-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: dir.color }} />
                        <h4 className="text-sm font-semibold text-ine-text">{dir.label}</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        {vencida > 0 && (
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(220,38,38,.09)', color: '#DC2626' }}>
                            {vencida} vencida{vencida !== 1 ? 's' : ''}
                          </span>
                        )}
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: dir.color + '18', color: dir.color }}>
                          {total} tarea{total !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>

                    {total === 0 ? (
                      <p className="text-xs text-ine-dim text-center py-2">Sin tareas registradas</p>
                    ) : (
                      <>
                        <div className="h-5 rounded-full overflow-hidden flex mb-3" style={{ background: '#EDE8F4' }}>
                          {completada  > 0 && <BarSegment pct={(completada  / total) * 100} color="#059669" title={`Completadas: ${completada}`} />}
                          {en_progreso > 0 && <BarSegment pct={(en_progreso / total) * 100} color="#2563EB" title={`En Progreso: ${en_progreso}`} />}
                          {pendiente   > 0 && <BarSegment pct={(pendiente   / total) * 100} color="#D1C4E9" title={`Pendientes: ${pendiente}`} />}
                        </div>
                        <div className="flex items-center justify-between text-xs text-ine-muted">
                          <div className="flex items-center gap-3 flex-wrap">
                            {completada  > 0 && <Legend color="#059669" label={`${completada} completada${completada !== 1 ? 's' : ''}`} />}
                            {en_progreso > 0 && <Legend color="#2563EB" label={`${en_progreso} en progreso`} />}
                            {pendiente   > 0 && <Legend color="#D97706" label={`${pendiente} pendiente${pendiente !== 1 ? 's' : ''}`} />}
                          </div>
                          <span className="font-bold" style={{ color: dir.color }}>{pct}%</span>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, sub, icon, iconBg, iconColor, valueColor }) {
  return (
    <div className="ine-card p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="ine-label mb-0">{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
             style={{ background: iconBg, color: iconColor }}>{icon}</div>
      </div>
      <p className="text-2xl md:text-3xl font-black" style={{ color: valueColor }}>{value}</p>
      <p className="text-xs text-ine-dim mt-1">{sub}</p>
    </div>
  )
}

function BarSegment({ pct, color, title }) {
  return <div className="h-full transition-all" style={{ width: `${pct}%`, background: color }} title={title} />
}

function Badge({ value, bg, color }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold"
          style={{ background: bg, color }}>
      {value}
    </span>
  )
}

function Legend({ color, label }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 rounded" style={{ background: color }} />
      {label}
    </div>
  )
}
