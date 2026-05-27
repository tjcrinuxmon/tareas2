import React, { useState, useEffect } from 'react'
import { getTasks } from '../api.js'
import { localToday } from '../constants.js'

const DAYS_ES   = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio',
                   'Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getTaskColor(weekDate, today, tomorrow) {
  if (weekDate < today)    return 'red'
  if (weekDate <= tomorrow) return 'yellow'
  return 'green'
}

const CHIP = {
  red:    { bg: '#FEE2E2', border: '#F87171', text: '#991B1B' },
  yellow: { bg: '#FEF9C3', border: '#FCD34D', text: '#854D0E' },
  green:  { bg: '#DCFCE7', border: '#86EFAC', text: '#166534' },
}

const DOT = {
  red:    '#EF4444',
  yellow: '#F59E0B',
  green:  '#22C55E',
}

export default function CalendarReport({ onTaskClick }) {
  const [tasks,   setTasks]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)
  const [nav, setNav] = useState(() => {
    const n = new Date()
    return { year: n.getFullYear(), month: n.getMonth() }
  })

  useEffect(() => {
    setLoading(true)
    setError(null)
    getTasks({ limit: 1000, hideCompleted: 'false' })
      .then(raw => setTasks(Array.isArray(raw) ? raw : (raw?.tasks ?? [])))
      .catch(() => setError('Error al cargar las tareas.'))
      .finally(() => setLoading(false))
  }, [])

  const today = localToday()
  const tomorrowDate = new Date(today + 'T00:00:00')
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = localToday(tomorrowDate)

  const { year, month } = nav

  // Calendar grid (Monday-first)
  const firstDow = new Date(year, month, 1).getDay()
  const startOffset = firstDow === 0 ? 6 : firstDow - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  // Group by week_date
  const byDate = {}
  for (const t of tasks) {
    if (!t.week_date) continue
    if (!byDate[t.week_date]) byDate[t.week_date] = []
    byDate[t.week_date].push(t)
  }

  const goPrev = () => setNav(({ year, month }) =>
    month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 })
  const goNext = () => setNav(({ year, month }) =>
    month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 })
  const goToday = () => {
    const n = new Date()
    setNav({ year: n.getFullYear(), month: n.getMonth() })
  }

  return (
    <div className="max-w-7xl mx-auto fade-in">
      {/* Page header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-ine-text">Calendario de Vencimientos</h1>
          <p className="text-sm text-ine-muted mt-0.5">Visualización de tareas por fecha de vencimiento</p>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-ine-muted">
          {[
            { label: 'Vencida',       color: DOT.red    },
            { label: 'Vence mañana',  color: DOT.yellow },
            { label: 'A tiempo',      color: DOT.green  },
          ].map(({ label, color }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="ine-card p-4">
        {/* Month navigation */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={goPrev}
            className="p-2 rounded-lg text-ine-muted hover:text-ine-purple hover:bg-ine-bg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-base font-bold text-ine-text min-w-[160px] text-center">
            {MONTHS_ES[month]} {year}
          </h2>
          <button
            onClick={goNext}
            className="p-2 rounded-lg text-ine-muted hover:text-ine-purple hover:bg-ine-bg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button
            onClick={goToday}
            className="btn-outline text-xs px-3 py-1.5 ml-1"
          >
            Hoy
          </button>
        </div>

        {loading && (
          <p className="text-center text-ine-muted py-20 text-sm">Cargando tareas…</p>
        )}
        {error && (
          <p className="text-center text-red-500 py-20 text-sm">{error}</p>
        )}

        {!loading && !error && (
          <div
            className="grid grid-cols-7 rounded-lg overflow-hidden"
            style={{ border: '1px solid #E2D9EE', gap: '1px', background: '#E2D9EE' }}
          >
            {/* Day-of-week headers */}
            {DAYS_ES.map((d) => (
              <div
                key={d}
                className="text-center text-xs font-semibold py-2"
                style={{ background: '#582E73', color: 'white' }}
              >
                {d}
              </div>
            ))}

            {/* Calendar cells */}
            {cells.map((day, i) => {
              if (!day) {
                return (
                  <div
                    key={`e-${i}`}
                    className="min-h-[110px]"
                    style={{ background: '#FAF8FC' }}
                  />
                )
              }

              const dateStr  = toDateStr(year, month, day)
              const dayTasks = byDate[dateStr] || []
              const isToday  = dateStr === today

              return (
                <div
                  key={dateStr}
                  className="min-h-[110px] p-1.5 flex flex-col"
                  style={{ background: isToday ? '#F5F0FB' : 'white' }}
                >
                  {/* Day number */}
                  <div className="flex justify-end mb-1">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                      style={isToday
                        ? { background: '#582E73', color: 'white' }
                        : { color: '#6B5F78' }
                      }
                    >
                      {day}
                    </span>
                  </div>

                  {/* Task chips */}
                  <div className="flex flex-col gap-0.5 overflow-y-auto" style={{ maxHeight: 120 }}>
                    {dayTasks.map((task) => {
                      const color = task.status === 'completada'
                        ? null
                        : getTaskColor(task.week_date, today, tomorrow)

                      if (!color) {
                        return (
                          <div
                            key={task.id}
                            className="text-xs px-1.5 py-0.5 rounded leading-tight truncate line-through"
                            style={{ background: '#F3F4F6', color: '#9CA3AF', borderLeft: '2px solid #D1D5DB', cursor: onTaskClick ? 'pointer' : 'default' }}
                            title={`${task.title} (completada)`}
                            onClick={() => onTaskClick?.(task.id)}
                          >
                            {task.title}
                          </div>
                        )
                      }

                      const s = CHIP[color]
                      return (
                        <div
                          key={task.id}
                          className="text-xs px-1.5 py-0.5 rounded leading-tight truncate"
                          style={{
                            background: s.bg,
                            borderLeft: `2px solid ${s.border}`,
                            color: s.text,
                            cursor: 'pointer',
                          }}
                          title={task.title}
                          onClick={() => onTaskClick?.(task.id)}
                        >
                          {task.title}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
