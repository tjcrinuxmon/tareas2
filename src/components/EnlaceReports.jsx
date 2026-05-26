import React, { useState, useEffect, useCallback } from 'react'
import { getEnlaceMatrix, addInhabilDay, removeInhabilDay, getTasks } from '../api.js'
import { DIRECCIONES, AREA_ABBREV, formatDate, localToday } from '../constants.js'

// ─── Estatus de celda ─────────────────────────────────────────────────────────
const CELL_SOLICITADOS = {
  inhabil:     { bg: '#FEF08A', color: '#854D0E', label: 'Inhábil'    },
  solicitud:   { bg: '#D1FAE5', color: '#065F46', label: 'Reportado'  },
  sin_reporte: { bg: '#D1FAE5', color: '#065F46', label: 'Reporte/SR' },
  pendiente:   { bg: '#F3F4F6', color: '#9CA3AF', label: 'Pendiente'  },
  vacio:       { bg: '#FEE2E2', color: '#991B1B', label: 'Sin reporte'},
}

const CELL_CONCLUIDOS = {
  inhabil:    { bg: '#FEF08A', color: '#854D0E', label: 'Inhábil' },
  concluido:  { bg: '#D1FAE5', color: '#065F46', label: 'Reporte' },
  pendiente:  { bg: '#FEF3C7', color: '#B45309', label: 'Pendiente' },
  sin_reporte:{ bg: '#D1FAE5', color: '#065F46', label: 'Reporte/SR' },
  vacio:      { bg: '#FEE2E2', color: '#991B1B', label: 'Sin reporte' },
}

const MONTHS = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
const DAYS   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

function getMondayStr(offsetWeeks = 0) {
  const now = new Date()
  const day = now.getDay()
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) + offsetWeeks * 7
  const monday = new Date(now); monday.setDate(diff)
  return localToday(monday)
}

function getWeekDates(mondayStr) {
  const monday = new Date(mondayStr + 'T12:00:00')
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday); d.setDate(monday.getDate() + i)
    return localToday(d)
  })
}

function formatWeekLabel(dates) {
  const start = new Date(dates[0] + 'T12:00:00')
  const end   = new Date(dates[6] + 'T12:00:00')
  const sm = MONTHS[start.getMonth()], em = MONTHS[end.getMonth()]
  if (start.getMonth() === end.getMonth())
    return `del ${start.getDate()} al ${end.getDate()} de ${sm}`
  return `del ${start.getDate()} de ${sm} al ${end.getDate()} de ${em}`
}

// ─── Lógica de celda: Solicitados ─────────────────────────────────────────────
function getSolicitadoStatus(userId, dateStr, pendingByUserDay, reports, inhabilDays = []) {
  if (inhabilDays.includes(dateStr)) return 'inhabil'
  const dow = new Date(dateStr + 'T12:00:00').getDay()
  if (dow === 0 || dow === 6) return 'inhabil'
  const today = localToday()
  if (dateStr > today) return 'pendiente'
  const has = pendingByUserDay.some(t => t.assigned_to === userId && t.week_date === dateStr)
  if (has) return 'solicitud'
  const report = reports?.find(r => r.user_id === userId && r.report_date === dateStr && r.report_type === 'solicitudes')
  if (report?.status === 'sin_reporte') return 'sin_reporte'
  return 'vacio'
}

// ─── Lógica de celda: Concluidos ──────────────────────────────────────────────
function getConcluidoStatus(userId, dateStr, completedByUserDay, reports, inhabilDays = []) {
  if (inhabilDays.includes(dateStr)) return 'inhabil'
  const today = localToday()
  const dow   = new Date(dateStr + 'T12:00:00').getDay()
  if (dow === 0 || dow === 6) return 'inhabil'
  if (dateStr > today) return 'pendiente'
  const hasCompleted = completedByUserDay.some(c => c.assigned_to === userId && c.task_date === dateStr)
  if (hasCompleted) return 'concluido'
  const report = reports?.find(r => r.user_id === userId && r.report_date === dateStr && r.report_type === 'conclusiones')
  if (report?.status === 'sin_reporte') return 'sin_reporte'
  return 'vacio'
}

// ─── Generadores de PDF ───────────────────────────────────────────────────────
function fmtShort(dateStr) {
  if (!dateStr) return '—'
  const d = new Date((dateStr.includes(' ') ? dateStr.replace(' ', 'T') : dateStr + 'T00:00:00'))
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const pdfStyles = `*{box-sizing:border-box;margin:0;padding:0}body{font-family:Arial,sans-serif;color:#1A1219;padding:32px;font-size:13px}.header{border-bottom:3px solid #582E73;padding-bottom:12px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-end}.brand{font-size:17px;font-weight:900;color:#582E73}.brand small{display:block;font-size:10px;font-weight:400;color:#6B5F78;margin-top:2px}.print-date{font-size:11px;color:#6B5F78}h1{font-size:16px;font-weight:900;color:#1A1219;margin-bottom:4px}.sub{font-size:11px;color:#6B5F78;margin-bottom:16px}table{width:100%;border-collapse:collapse;margin-bottom:20px}th{background:#2A1239;color:rgba(255,255,255,.85);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;padding:8px 10px;text-align:left}.summary{display:flex;gap:20px;flex-wrap:wrap;margin-top:8px}.chip{padding:6px 14px;border-radius:20px;font-size:12px;font-weight:700}.footer{margin-top:28px;padding-top:10px;border-top:1px solid #EDE8F4;font-size:10px;color:#A090B0;text-align:center}@media print{body{padding:16px}}`

const sortByDir = (a, b) =>
  DIRECCIONES.findIndex(d => d.key === a.direccion) - DIRECCIONES.findIndex(d => d.key === b.direccion)

function buildSolicitadosPDF(tasks, weekLabel) {
  const sorted = [...tasks].sort(sortByDir)
  const today = localToday()
  const vencidas = sorted.filter(t => !t.closed_at && t.status !== 'completada' && t.week_date < today)
  const enTiempo = sorted.length - vencidas.length
  const ts = new Date().toLocaleString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })

  const rows = sorted.map(t => {
    const dir = DIRECCIONES.find(d => d.key === t.direccion)
    const isV = !t.closed_at && t.status !== 'completada' && t.week_date < today
    return `<tr style="background:${isV ? '#FEF2F2' : ''}">
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px;color:${dir?.color||'#333'};font-weight:600">${dir?.label || t.direccion}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px">${t.description || t.title}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px;white-space:nowrap">${fmtShort(t.created_at)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px;white-space:nowrap;color:${isV?'#DC2626':''};font-weight:${isV?'700':'400'}">${fmtShort(t.week_date)}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Asuntos Relevantes Solicitados</title><style>${pdfStyles}</style></head><body>
  <div class="header"><div class="brand">INE · DEAJ<small>Dirección Ejecutiva de Asuntos Jurídicos</small></div><div class="print-date">Impreso: ${ts}</div></div>
  <h1>Asuntos Relevantes Solicitados — Alta Prioridad</h1>
  <p class="sub">Semana ${weekLabel} — ${tasks.length} actividad${tasks.length!==1?'es':''}</p>
  <table><thead><tr><th>Área</th><th>Descripción</th><th>Fecha de creación</th><th>Fecha de vencimiento</th></tr></thead>
  <tbody>${rows||'<tr><td colspan="4" style="padding:14px;text-align:center;color:#6B5F78">Sin actividades en el período seleccionado</td></tr>'}</tbody></table>
  <div class="summary">
    <div class="chip" style="background:#F3EDF9;color:#582E73">Total: ${sorted.length}</div>
    <div class="chip" style="background:rgba(5,150,105,.09);color:#047857">En tiempo: ${enTiempo}</div>
    ${vencidas.length>0?`<div class="chip" style="background:rgba(220,38,38,.09);color:#DC2626">Vencidas: ${vencidas.length}</div>`:''}
  </div>
  <div class="footer">Sistema de Seguimiento de Tareas · INE · DEAJ · ${new Date().getFullYear()}</div>
  </body></html>`

  const w = window.open('', '_blank', 'width=1050,height=750')
  w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400)
}

function buildConcluidosPDF(tasks, weekLabel) {
  const sorted = [...tasks].sort(sortByDir)
  const onTime = sorted.filter(t => t.closed_at <= t.week_date)
  const late   = sorted.filter(t => t.closed_at >  t.week_date)
  const ts = new Date().toLocaleString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })

  const rows = sorted.map(t => {
    const dir = DIRECCIONES.find(d => d.key === t.direccion)
    const isLate = t.closed_at > t.week_date
    return `<tr style="background:${isLate ? '#FEF2F2' : ''}">
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px;color:${dir?.color||'#333'};font-weight:600">${dir?.label || t.direccion}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px">${t.description || t.title}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px;white-space:nowrap">${fmtShort(t.created_at)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px;white-space:nowrap">${fmtShort(t.week_date)}</td>
      <td style="padding:7px 10px;border-bottom:1px solid #EDE8F4;font-size:12px;white-space:nowrap;color:${isLate?'#DC2626':'#059669'};font-weight:600">${fmtShort(t.closed_at)}</td>
    </tr>`
  }).join('')

  const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Asuntos Relevantes Concluidos</title><style>${pdfStyles}</style></head><body>
  <div class="header"><div class="brand">INE · DEAJ<small>Dirección Ejecutiva de Asuntos Jurídicos</small></div><div class="print-date">Impreso: ${ts}</div></div>
  <h1>Asuntos Relevantes Concluidos — Alta Prioridad</h1>
  <p class="sub">Semana ${weekLabel} — ${sorted.length} actividad${sorted.length!==1?'es':''} cerrada${sorted.length!==1?'s':''}</p>
  <table><thead><tr><th>Área</th><th>Descripción</th><th>Fecha de creación</th><th>Fecha de vencimiento</th><th>Fecha de cierre</th></tr></thead>
  <tbody>${rows||'<tr><td colspan="5" style="padding:14px;text-align:center;color:#6B5F78">Sin actividades cerradas en el período seleccionado</td></tr>'}</tbody></table>
  <div class="summary">
    <div class="chip" style="background:#F3EDF9;color:#582E73">Total cerradas: ${sorted.length}</div>
    <div class="chip" style="background:rgba(5,150,105,.09);color:#047857">En tiempo: ${onTime.length}</div>
    ${late.length>0?`<div class="chip" style="background:rgba(220,38,38,.09);color:#DC2626">Fuera de tiempo: ${late.length}</div>`:''}
  </div>
  <div class="footer">Sistema de Seguimiento de Tareas · INE · DEAJ · ${new Date().getFullYear()}</div>
  </body></html>`

  const w = window.open('', '_blank', 'width=1050,height=750')
  w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 400)
}

function buildGroups(users) {
  const g = {}
  for (const u of users) { if (!g[u.direccion]) g[u.direccion] = []; g[u.direccion].push(u) }
  return g
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function EnlaceReports({ user }) {
  const [tab, setTab]               = useState('solicitados')
  const [weekOffset, setWeekOffset] = useState(0)
  const [matrixData, setMatrixData] = useState(null)
  const [loading, setLoading]       = useState(true)

  // Inhábil management
  const canManageInhabil = user?.role === 'admin' || user?.direccion === 'enlace_interinstitucional'
  const [showInhabilPanel, setShowInhabilPanel] = useState(false)
  const [inhabilDate, setInhabilDate]   = useState(localToday())
  const [inhabilReason, setInhabilReason] = useState('')
  const [savingInhabil, setSavingInhabil] = useState(false)
  const [inhabilError, setInhabilError]   = useState(null)

  const [generatingPDF, setGeneratingPDF] = useState(false)

  const mondayStr = getMondayStr(weekOffset)
  const dates     = getWeekDates(mondayStr)
  const weekLabel = formatWeekLabel(dates)
  const workDates = dates.filter(d => { const dow = new Date(d + 'T12:00:00').getDay(); return dow !== 0 && dow !== 6 })

  const handlePDFSolicitados = async () => {
    setGeneratingPDF(true)
    try {
      const allTasks = await getTasks({ priority: 'alta' })
      const weekTasks = allTasks.filter(t => t.week_date >= dates[0] && t.week_date <= dates[6])
      buildSolicitadosPDF(weekTasks, weekLabel)
    } catch { alert('Error al generar el PDF.') }
    finally { setGeneratingPDF(false) }
  }

  const handlePDFConcluidos = async () => {
    setGeneratingPDF(true)
    try {
      const allTasks = await getTasks({ priority: 'alta' })
      const closedTasks = allTasks.filter(t => t.closed_at && t.closed_at >= dates[0] && t.closed_at <= dates[6])
      buildConcluidosPDF(closedTasks, weekLabel)
    } catch { alert('Error al generar el PDF.') }
    finally { setGeneratingPDF(false) }
  }

  const load = useCallback(async () => {
    setLoading(true)
    try { setMatrixData(await getEnlaceMatrix(mondayStr)) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }, [mondayStr])

  useEffect(() => { load() }, [load])

  const handleAddInhabil = async (e) => {
    e.preventDefault()
    setSavingInhabil(true); setInhabilError(null)
    try {
      await addInhabilDay(inhabilDate, inhabilReason)
      setInhabilReason('')
      await load()
    } catch (err) {
      setInhabilError(err?.response?.data?.error || 'Error al guardar')
    } finally { setSavingInhabil(false) }
  }

  const handleRemoveInhabil = async (date) => {
    if (!window.confirm(`¿Quitar ${formatDate(date)} de días inhábiles?`)) return
    try { await removeInhabilDay(date); await load() }
    catch { alert('Error al eliminar') }
  }

  const userGroups = matrixData ? buildGroups(matrixData.users) : {}
  const allInhabilDays = matrixData?.inhabilDays || []

  const tabs = [
    { key: 'solicitados', label: 'Solicitados' },
    { key: 'concluidos',  label: 'Concluidos'  },
  ]

  return (
    <div className="fade-in max-w-full">
      {/* Header */}
      <div className="bg-white rounded-xl mb-5 px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
        style={{ border:'1.5px solid #E2D9EE', borderLeft:'5px solid #E91E8C', boxShadow:'0 2px 8px rgba(88,46,115,.07)' }}>
        <div>
          <h2 className="text-lg font-bold text-ine-text">Seguimiento Diario — DEAJ</h2>
          <p className="text-xs text-ine-muted mt-0.5">Asuntos relevantes de alta prioridad · Semana {weekLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => setWeekOffset(w => w - 1)} className="btn-outline text-xs py-1.5 px-3">← Anterior</button>
          <button onClick={() => setWeekOffset(0)} className="btn-outline text-xs py-1.5 px-3">Hoy</button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="btn-outline text-xs py-1.5 px-3">Siguiente →</button>
          {canManageInhabil && (
            <button
              onClick={() => setShowInhabilPanel(v => !v)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
              style={showInhabilPanel
                ? { background:'#FEF08A', color:'#854D0E', border:'1.5px solid #FCD34D' }
                : { background:'#FEFCE8', color:'#854D0E', border:'1.5px solid #FDE68A' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Días Inhábiles
            </button>
          )}
          {tab === 'solicitados' && (
            <button onClick={handlePDFSolicitados} disabled={generatingPDF || loading} className="btn-ine text-xs py-1.5 px-3">
              {generatingPDF ? 'Generando...' : 'PDF Solicitados'}
            </button>
          )}
          {tab === 'concluidos' && (
            <button onClick={handlePDFConcluidos} disabled={generatingPDF || loading} className="btn-ine text-xs py-1.5 px-3">
              {generatingPDF ? 'Generando...' : 'PDF Concluidos'}
            </button>
          )}
        </div>
      </div>

      {/* Inhábil management panel */}
      {canManageInhabil && showInhabilPanel && (
        <div className="rounded-xl mb-5 overflow-hidden"
             style={{ border:'1.5px solid #FCD34D', borderTop:'3px solid #EAB308' }}>
          <div className="px-5 py-3 flex items-center gap-2"
               style={{ background:'#FEFCE8', borderBottom:'1px solid #FDE68A' }}>
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                 style={{ color:'#EAB308' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-bold" style={{ color:'#854D0E' }}>Gestión de Días Inhábiles</span>
          </div>
          <div className="p-5 bg-white">
            <form onSubmit={handleAddInhabil} className="flex flex-wrap gap-3 items-end mb-5">
              <div>
                <label className="ine-label mb-1 block">Fecha</label>
                <input type="date" value={inhabilDate} onChange={e => setInhabilDate(e.target.value)}
                       className="ine-input" style={{ width:'auto' }} />
              </div>
              <div className="flex-1" style={{ minWidth:180 }}>
                <label className="ine-label mb-1 block">Motivo (opcional)</label>
                <input type="text" value={inhabilReason} onChange={e => setInhabilReason(e.target.value)}
                       placeholder="Ej. Día festivo nacional"
                       className="ine-input" />
              </div>
              <button type="submit" disabled={savingInhabil}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60"
                      style={{ background:'#EAB308' }}>
                {savingInhabil
                  ? <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Guardando...</>
                  : <>+ Marcar Inhábil</>}
              </button>
              {inhabilError && <p className="w-full text-xs font-medium" style={{ color:'#B91C1C' }}>{inhabilError}</p>}
            </form>

            {/* All registered inhábil days (full list, not week-filtered) */}
            <InhabilDaysList matrixData={matrixData} onRemove={handleRemoveInhabil} />
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-5 py-2 text-sm font-semibold rounded-lg transition-colors"
            style={tab === t.key
              ? { background:'#582E73', color:'white' }
              : { background:'white', color:'#6B5F78', border:'1.5px solid #E2D9EE' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading
        ? <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor:'#E2D9EE', borderTopColor:'#582E73' }} />
          </div>
        : <MatrixTable
            key={tab}
            tab={tab}
            userGroups={userGroups}
            workDates={workDates}
            matrixData={matrixData}
            inhabilDays={allInhabilDays}
          />
      }
    </div>
  )
}

// ─── Lista de días inhábiles registrados ──────────────────────────────────────
function InhabilDaysList({ matrixData, onRemove }) {
  // Fetch full list from a separate state — we reuse the matrix inhabilDays
  // which is week-scoped. For the panel we need the full list, so we keep a
  // dedicated fetch via a simple useEffect inside this component.
  const [allDays, setAllDays] = useState([])
  useEffect(() => {
    import('../api.js').then(({ getInhabilDays }) =>
      getInhabilDays().then(setAllDays).catch(() => {})
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matrixData]) // refresh whenever matrix reloads (which happens after add/remove)

  if (!allDays.length)
    return <p className="text-xs text-ine-dim">No hay días inhábiles registrados.</p>

  return (
    <div>
      <p className="ine-label mb-2">Días registrados</p>
      <div className="flex flex-wrap gap-2">
        {allDays.map(d => (
          <div key={d.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
               style={{ background:'#FEF08A', color:'#854D0E', border:'1px solid #FCD34D' }}>
            <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(d.date)}{d.reason ? ` — ${d.reason}` : ''}
            <button onClick={() => onRemove(d.date)}
                    className="ml-1 rounded transition-colors hover:opacity-70"
                    title="Quitar día inhábil">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tabla de matriz ──────────────────────────────────────────────────────────
function MatrixTable({ tab, userGroups, workDates, matrixData, inhabilDays = [] }) {
  if (!matrixData) return null
  const { pendingByUserDay, completedByUserDay, reports } = matrixData
  const totalUsers = Object.values(userGroups).flat().length

  if (totalUsers === 0)
    return <div className="bg-white rounded-xl p-10 text-center" style={{ border:'1.5px solid #E2D9EE' }}>
      <p className="text-ine-muted text-sm">Sin usuarios registrados.</p>
    </div>

  return (
    <div className="bg-white rounded-xl overflow-auto" style={{ border:'1.5px solid #E2D9EE' }}>
      <table className="w-full border-collapse text-xs" style={{ minWidth:600 }}>
        <thead>
          <tr style={{ background:'#F8F5FB' }}>
            <th className="px-3 py-2.5 text-center font-bold text-ine-dim uppercase border-b border-r"
              style={{ borderColor:'#E2D9EE', width:56 }}>Área</th>
            <th className="px-3 py-2.5 text-left font-bold text-ine-dim uppercase border-b border-r"
              style={{ borderColor:'#E2D9EE', minWidth:180 }}>Dirección / Subdirección</th>
            {workDates.map(d => {
              const dt = new Date(d + 'T12:00:00')
              return <th key={d} className="px-2 py-2.5 text-center font-bold text-ine-dim uppercase border-b border-r"
                style={{ borderColor:'#E2D9EE', minWidth:96 }}>
                {DAYS[dt.getDay()]} {dt.getDate()}
              </th>
            })}
          </tr>
        </thead>
        <tbody>
          {DIRECCIONES.filter(dir => userGroups[dir.key]).map(dir => {
            const du = userGroups[dir.key]
            const abbrev = AREA_ABBREV[dir.key] || dir.key.slice(0,4).toUpperCase()
            return du.map((u, i) => (
              <tr key={u.id} style={{ borderBottom:'1px solid #F3F0F7' }}>
                {i === 0 && (
                  <td rowSpan={du.length} className="text-center align-middle font-black border-r py-2 px-1"
                    style={{ borderColor:'#E2D9EE', background: dir.color, color:'white', fontSize:10 }}>
                    {abbrev}
                  </td>
                )}
                <td className="px-3 py-2 border-r font-medium text-ine-text" style={{ borderColor:'#E2D9EE' }}>{u.name}</td>
                {workDates.map(d => {
                  const st  = tab === 'solicitados'
                    ? getSolicitadoStatus(u.id, d, pendingByUserDay, reports, inhabilDays)
                    : getConcluidoStatus(u.id, d, completedByUserDay, reports, inhabilDays)
                  const cfg = tab === 'solicitados' ? CELL_SOLICITADOS[st] : CELL_CONCLUIDOS[st]
                  return <td key={d} className="text-center py-2 px-1 border-r"
                    style={{ borderColor:'#E2D9EE', background: cfg.bg }}>
                    <span className="font-semibold" style={{ color: cfg.color, fontSize:10 }}>{cfg.label}</span>
                  </td>
                })}
              </tr>
            ))
          })}
        </tbody>
      </table>
    </div>
  )
}
