import React from 'react'
import { getDireccion, STATUS_CONFIG, PRIORITY_CONFIG, formatWeek, DIRECCIONES, localToday } from '../constants.js'

export default function TaskCard({ task, onClick }) {
  const dir = getDireccion(task.direccion)
  const today = localToday()
  const isVencida = !task.closed_at && task.status !== 'completada' && task.week_date < today
  const statusCfg = isVencida
    ? { label: 'Vencida', bg: 'rgba(220,38,38,.09)', color: '#DC2626', border: 'rgba(220,38,38,.25)' }
    : (STATUS_CONFIG[task.status] || STATUS_CONFIG.pendiente)
  const prioCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media
  const pct = task.closed_at ? 100 : (task.latest_percentage ?? 0)

  // Resolve assigned areas from the pipe-separated key list returned by the server
  const areaDirs = task.assigned_area_keys
    ? task.assigned_area_keys.split('|').map(k => DIRECCIONES.find(d => d.key === k)).filter(Boolean)
    : [dir]
  const isMultiArea = areaDirs.length > 1

  const mustDoAreaClosure = (task.direct_closers_total || 0) > 0
  const allDirectClosersDone = mustDoAreaClosure && (task.direct_closers_done || 0) >= task.direct_closers_total
  const areasNeedingApproval = task.areas_needing_approval || 0
  const allApproved = areasNeedingApproval === 0 || (task.approvals_done || 0) >= areasNeedingApproval
  const barColor = task.closed_at || (mustDoAreaClosure && allApproved)
    ? '#059669'
    : (allDirectClosersDone ? '#2563EB' : (areaDirs[0]?.color || dir.color))

  // Build area → puesto[] map from "area:puesto|..." string
  const areaPuestosMap = {}
  if (task.assigned_area_puestos) {
    task.assigned_area_puestos.split('|').forEach(entry => {
      const sep = entry.indexOf(':')
      if (sep === -1) return
      const area = entry.slice(0, sep)
      const puesto = entry.slice(sep + 1)
      if (!areaPuestosMap[area]) areaPuestosMap[area] = []
      if (!areaPuestosMap[area].includes(puesto)) areaPuestosMap[area].push(puesto)
    })
  }

  // Hover border color: red if vencida, first area color otherwise
  const hoverColor = isVencida ? '#DC2626' : areaDirs[0]?.color || dir.color

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-xl cursor-pointer group transition-all fade-in overflow-hidden"
      style={{
        border: isVencida ? '1.5px solid rgba(220,38,38,.35)' : '1.5px solid #E2D9EE',
        boxShadow: '0 2px 8px rgba(88,46,115,.07)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = hoverColor
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(88,46,115,.13)'
        e.currentTarget.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = isVencida ? 'rgba(220,38,38,.35)' : '#E2D9EE'
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(88,46,115,.07)'
        e.currentTarget.style.transform = ''
      }}
    >
      {/* Color top bar — segmented for multi-area */}
      {isMultiArea
        ? <div className="h-1.5 w-full flex">
            {areaDirs.map(d => <div key={d.key} className="flex-1 h-full" style={{ background: d.color }} />)}
          </div>
        : <div className="h-1.5 w-full" style={{ background: dir.color }} />
      }

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-sm font-semibold text-ine-text group-hover:text-ine-purple transition-colors leading-snug line-clamp-2 flex-1">
            {task.title}
          </h3>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border"
              style={{ background: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.border }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusCfg.color }} />
              {statusCfg.label}
            </span>
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold border"
              style={{ background: prioCfg.bg, color: prioCfg.color, borderColor: prioCfg.border }}
            >
              {prioCfg.icon} {prioCfg.label}
            </span>
          </div>
        </div>

        {/* Area badges — compact shortLabel for multi-area, full label for single */}
        <div className="flex flex-wrap gap-1 mb-1">
          {areaDirs.map(d => (
            <div key={d.key}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium"
              style={{ background: d.color + '15', color: d.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
              {isMultiArea ? d.shortLabel : d.label}
            </div>
          ))}
        </div>

        {/* Assignment chain — puestos grouped by area */}
        {Object.keys(areaPuestosMap).length > 0 && (
          <div className="mb-3 space-y-0.5">
            {areaDirs.map(d => {
              const puestos = areaPuestosMap[d.key]
              if (!puestos?.length) return null
              return puestos.map((puesto, i) => (
                <div key={`${d.key}-${i}`} className="flex items-center gap-1" style={{ paddingLeft: '4px' }}>
                  <svg className="w-2.5 h-2.5 flex-shrink-0" style={{ color: d.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <span className="text-xs text-ine-muted truncate">{puesto}</span>
                </div>
              ))
            })}
          </div>
        )}

        {/* Description */}
        {task.description && (
          <p className="text-xs text-ine-muted mb-3 line-clamp-2 leading-relaxed">{task.description}</p>
        )}

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-ine-dim">Avance</span>
            <span className="text-xs font-bold" style={{ color: barColor }}>
              {pct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#EDE8F4' }}>
            <div
              className="h-full rounded-full progress-bar-fill"
              style={{ width: `${pct}%`, background: barColor }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2" style={{ borderTop: '1px solid #EDE8F4' }}>
          <div className="flex items-center gap-1 text-xs text-ine-dim">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="truncate max-w-[120px]">{formatWeek(task.week_date)}</span>
          </div>
          <div className="flex items-center gap-2">
            {task.attachment_count > 0 && <Chip icon="📎" count={task.attachment_count} />}
            {task.comment_count > 0 && <Chip icon="💬" count={task.comment_count} />}
            {task.progress_count > 0 && <Chip icon="📊" count={task.progress_count} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function Chip({ icon, count }) {
  return (
    <span className="flex items-center gap-0.5 text-xs text-ine-dim">
      <span>{icon}</span>
      {count}
    </span>
  )
}
