import React, { useState, useEffect } from 'react'
import { createTask, updateTask, uploadFile, getUsers, closeTask } from '../api.js'
import { DIRECCIONES, STATUS_CONFIG, PRIORITY_CONFIG, formatFileSize, localToday } from '../constants.js'

function getFileIcon(name) {
  const ext = name.split('.').pop().toLowerCase()
  if (ext === 'pdf') return '📄'
  if (['doc','docx'].includes(ext)) return '📝'
  if (['xls','xlsx'].includes(ext)) return '📊'
  if (['jpg','jpeg','png','gif','webp'].includes(ext)) return '🖼️'
  if (['zip','rar','7z'].includes(ext)) return '📦'
  return '📎'
}

export default function TaskForm({ task, onCancel, onSaved, initialFilters, user }) {
  const isEdit = !!task
  const lockedDireccion = (user?.role === 'director' || user?.role === 'subdirector') ? user.direccion : null

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    direccion: task?.direccion || lockedDireccion || initialFilters?.direccion || DIRECCIONES[0].key,
    week_date: task?.week_date || localToday(),
    status: task?.status || 'pendiente',
    priority: task?.priority || 'media',
    assigned_to: task?.assignees?.map(a => String(a.id)) || (task?.assigned_to ? [String(task.assigned_to)] : []),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [uploadStatus, setUploadStatus] = useState(null)
  const [users, setUsers] = useState([])

  const [closureNotes, setClosureNotes] = useState('')
  const [closureDate, setClosureDate] = useState(localToday())
  const [closureFile, setClosureFile] = useState(null)
  const [isDraggingClosure, setIsDraggingClosure] = useState(false)
  const [isDraggingAttach, setIsDraggingAttach] = useState(false)

  useEffect(() => {
    getUsers().then(setUsers).catch(() => {})
  }, [])

  // Pending files — only used on create
  const [pendingFiles, setPendingFiles] = useState([])

  const selectedDir = DIRECCIONES.find((d) => d.key === form.direccion) || DIRECCIONES[0]

  // For ejecutiva/admin: one checkbox per area, maps to the director of that area
  const areaOptions = !lockedDireccion
    ? DIRECCIONES.map(dir => ({
        dir,
        director: users.find(u => u.role === 'director' && u.direccion === dir.key) || null
      })).filter(({ director }) => director !== null)
    : []

  // For directors: all subdirectors grouped by area
  const subdirectorsByArea = lockedDireccion
    ? DIRECCIONES.map(dir => ({
        dir,
        subdirectors: users.filter(u => u.role === 'subdirector' && u.direccion === dir.key)
      })).filter(({ subdirectors }) => subdirectors.length > 0)
    : []

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  // Toggle area assignment (ejecutiva/admin): maps area → director ID, auto-sets direccion
  const toggleArea = (directorId, areaKey) => {
    const id = String(directorId)
    setForm(f => {
      const newAssigned = f.assigned_to.includes(id)
        ? f.assigned_to.filter(i => i !== id)
        : [...f.assigned_to, id]
      const firstArea = areaOptions.find(({ director }) => newAssigned.includes(String(director.id)))
      return { ...f, assigned_to: newAssigned, direccion: firstArea?.dir.key || f.direccion }
    })
  }

  // Toggle individual assignee (director → subdirector)
  const toggleAssignee = (id) => {
    setForm(f => ({
      ...f,
      assigned_to: f.assigned_to.includes(id)
        ? f.assigned_to.filter(i => i !== id)
        : [...f.assigned_to, id]
    }))
  }

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    setPendingFiles((prev) => [...prev, ...files])
    e.target.value = ''
  }

  const handleDropAttach = (e) => {
    e.preventDefault()
    setIsDraggingAttach(false)
    const files = Array.from(e.dataTransfer.files || [])
    if (files.length) setPendingFiles((prev) => [...prev, ...files])
  }

  const removePendingFile = (idx) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
  }

  const isClosing = isEdit && form.status === 'completada'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('El título es requerido.'); return }
    if (form.week_date < localToday()) { setError('La fecha de vencimiento no puede ser anterior a hoy.'); return }
    if (isClosing && !closureNotes.trim()) { setError('La síntesis de cierre es requerida.'); return }
    setSaving(true)
    setError(null)
    setUploadStatus(null)
    try {
      let saved
      if (isEdit) {
        if (isClosing) {
          // Update non-status fields first, then close
          await updateTask(task.id, {
            title: form.title.trim(),
            description: form.description.trim(),
            direccion: form.direccion,
            week_date: form.week_date,
            priority: form.priority,
            assigned_to: form.assigned_to.map(Number),
          })
          const fd = new FormData()
          fd.append('closure_notes', closureNotes.trim())
          fd.append('closed_at', closureDate)
          if (closureFile) fd.append('file', closureFile)
          saved = await closeTask(task.id, fd)
        } else {
          saved = await updateTask(task.id, {
            title: form.title.trim(),
            description: form.description.trim(),
            direccion: form.direccion,
            status: form.status,
            week_date: form.week_date,
            priority: form.priority,
            assigned_to: form.assigned_to.map(Number),
          })
        }
      } else {
        saved = await createTask({
          title: form.title.trim(),
          description: form.description.trim(),
          direccion: form.direccion,
          week_date: form.week_date,
          priority: form.priority,
          assigned_to: form.assigned_to.map(Number),
        })
        // Upload pending files after task creation
        if (pendingFiles.length > 0) {
          for (let i = 0; i < pendingFiles.length; i++) {
            setUploadStatus(`Subiendo archivo ${i + 1} de ${pendingFiles.length}...`)
            await uploadFile(saved.id, pendingFiles[i])
          }
          setUploadStatus(null)
        }
      }
      onSaved(saved)
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al guardar la tarea.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fade-in max-w-2xl mx-auto">
      {/* Page header */}
      <div className="bg-white rounded-xl mb-5 px-5 py-4"
           style={{ borderLeft: '5px solid #582E73', border: '1.5px solid #E2D9EE', borderLeft: '5px solid #582E73', boxShadow: '0 2px 8px rgba(88,46,115,.07)' }}>
        <h2 className="text-lg font-bold text-ine-text">{isEdit ? 'Editar Tarea' : 'Nueva Tarea'}</h2>
        <p className="text-xs text-ine-muted mt-0.5">
          {isEdit ? 'Modifica los datos de la tarea seleccionada.' : 'Completa el formulario para registrar una nueva tarea.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="ine-card overflow-hidden">
        {/* Color bar */}
        <div className="h-1.5" style={{ background: selectedDir.color }} />

        <div className="p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-2 rounded-lg px-4 py-3 text-sm"
                 style={{ background: 'rgba(220,38,38,.07)', border: '1px solid rgba(220,38,38,.22)', color: '#B91C1C' }}>
              <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="ine-label">Título <span className="ine-required">*</span></label>
            <input
              type="text" name="title" value={form.title} onChange={handleChange}
              placeholder="Ej. Revisión de expediente 2024-001"
              required className="ine-input"
            />
          </div>

          {/* Description */}
          <div>
            <label className="ine-label">Descripción</label>
            <textarea
              name="description" value={form.description} onChange={handleChange}
              placeholder="Describe los detalles de la tarea..."
              rows={4} className="ine-input" style={{ resize: 'none' }}
            />
          </div>

          {/* Área — locked badge for directors, omitted for ejecutiva/admin (driven by assignment) */}
          {lockedDireccion && (() => {
            const d = DIRECCIONES.find((d) => d.key === lockedDireccion) || DIRECCIONES[0]
            return (
              <div className="flex items-center gap-3 p-3 rounded-lg"
                   style={{ border: `2px solid ${d.color}`, background: d.color + '10' }}>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: d.color }} />
                <span className="text-sm font-semibold" style={{ color: d.color }}>{d.fullLabel}</span>
                <span className="ml-auto text-xs text-ine-dim italic">Tu área</span>
              </div>
            )
          })()}

          {/* Assignment — areas (ejecutiva/admin) or subdirectors (director) */}
          <div>
            <label className="ine-label">
              {lockedDireccion ? 'Turnar a subdirector' : 'Turnar al área'}
            </label>

            {!lockedDireccion ? (
              /* Ejecutiva/admin: one checkbox per area */
              <div className="space-y-2">
                {areaOptions.length === 0
                  ? <p className="text-xs text-ine-dim py-2">No hay directores registrados</p>
                  : areaOptions.map(({ dir, director }) => {
                      const checked = form.assigned_to.includes(String(director.id))
                      return (
                        <label key={dir.key}
                          className="relative flex items-center gap-3 p-3 rounded-lg cursor-pointer select-none transition-all"
                          style={checked
                            ? { border: `1.5px solid ${dir.color}`, background: dir.color + '0D' }
                            : { border: '1.5px solid #E2D9EE', background: 'white' }
                          }
                        >
                          <span className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                            style={checked ? { background: dir.color, borderColor: dir.color } : { borderColor: '#D1C4E0' }}>
                            {checked && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </span>
                          <input type="checkbox" checked={checked}
                            onChange={() => toggleArea(director.id, dir.key)} className="sr-only" />
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: dir.color }} />
                          <span className="text-sm font-semibold flex-1" style={checked ? { color: dir.color } : { color: '#1A1219' }}>
                            {dir.fullLabel}
                          </span>
                        </label>
                      )
                    })
                }
                {form.assigned_to.length === 0 && (
                  <p className="text-xs text-ine-dim mt-1">Sin asignar</p>
                )}
              </div>
            ) : (
              /* Director: all subdirectors grouped by area */
              subdirectorsByArea.length === 0
                ? <p className="text-xs text-ine-dim py-2">No hay subdirectores registrados</p>
                : <div className="space-y-3">
                    {subdirectorsByArea.map(({ dir, subdirectors }) => (
                      <div key={dir.key}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dir.color }} />
                          <span className="text-xs font-semibold" style={{ color: dir.color }}>{dir.fullLabel}</span>
                        </div>
                        <div className="space-y-1.5 pl-2">
                          {subdirectors.map(u => {
                            const checked = form.assigned_to.includes(String(u.id))
                            return (
                              <label key={u.id}
                                className="relative flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer select-none transition-all"
                                style={checked
                                  ? { border: `1.5px solid ${dir.color}`, background: dir.color + '08' }
                                  : { border: '1.5px solid #E2D9EE', background: 'white' }
                                }
                              >
                                <span className="w-4 h-4 rounded border flex items-center justify-center flex-shrink-0"
                                  style={checked ? { background: dir.color, borderColor: dir.color } : { borderColor: '#D1C4E0' }}>
                                  {checked && (
                                    <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </span>
                                <input type="checkbox" checked={checked}
                                  onChange={() => toggleAssignee(String(u.id))} className="sr-only" />
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm font-medium text-ine-text">{u.puesto || u.name}</span>
                                  {u.puesto && (
                                    <p className="text-xs text-ine-muted leading-tight mt-0.5 truncate">{u.name}</p>
                                  )}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
            )}
            <p className="text-xs text-ine-dim mt-1.5">Las personas asignadas recibirán una notificación</p>
          </div>

          {/* Priority */}
          <div>
            <label className="ine-label">Prioridad <span className="ine-required">*</span></label>
            <div className="flex gap-2">
              {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => (
                <label
                  key={key}
                  className="relative flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg cursor-pointer transition-colors text-sm font-bold"
                  style={form.priority === key
                    ? { border: `2px solid ${cfg.color}`, background: cfg.bg, color: cfg.color }
                    : { border: '2px solid #E2D9EE', background: 'white', color: '#6B5F78' }
                  }
                >
                  <input type="radio" name="priority" value={key} checked={form.priority === key}
                    onChange={handleChange} className="sr-only" />
                  {cfg.icon} {cfg.label}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="ine-label">Fecha de vencimiento <span className="ine-required">*</span></label>
              <input type="date" name="week_date" value={form.week_date} onChange={handleChange}
                required min={localToday()} className="ine-input" />
            </div>

            {isEdit && (
              <div>
                <label className="ine-label">Estado</label>
                <div className="space-y-2">
                  {Object.entries(STATUS_CONFIG).filter(([, v]) => !v.noForm).map(([k, v]) => (
                    <label
                      key={k}
                      className="relative flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all"
                      style={form.status === k
                        ? { border: `1.5px solid ${v.color}`, background: v.bg }
                        : { border: '1.5px solid #E2D9EE', background: 'white' }
                      }
                    >
                      <input type="radio" name="status" value={k} checked={form.status === k}
                        onChange={handleChange} className="sr-only" />
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: v.color }} />
                      <span className="text-sm font-medium" style={{ color: v.color }}>{v.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Closure fields — shown when editing and status is Completada */}
          {isClosing && (
            <div className="rounded-xl p-4 space-y-4" style={{ border: '1.5px solid rgba(5,150,105,.3)', background: 'rgba(5,150,105,.04)' }}>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                     style={{ background: 'rgba(5,150,105,.15)', color: '#059669' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-sm font-bold" style={{ color: '#059669' }}>Datos de Cierre</span>
              </div>
              <div>
                <label className="ine-label">Síntesis del cierre <span className="ine-required">*</span></label>
                <textarea
                  value={closureNotes}
                  onChange={(e) => setClosureNotes(e.target.value)}
                  placeholder="Describe brevemente cómo se resolvió o cerró esta actividad..."
                  rows={4}
                  className="ine-input"
                  style={{ resize: 'none' }}
                />
              </div>
              <div>
                <label className="ine-label">Fecha de cierre</label>
                <input
                  type="date"
                  value={closureDate}
                  onChange={(e) => setClosureDate(e.target.value)}
                  min={task?.created_at?.split(' ')[0]}
                  className="ine-input"
                />
              </div>
              <div>
                <label className="ine-label">
                  Evidencia en PDF
                  <span className="text-xs font-normal ml-1" style={{ color: '#A090B0' }}>(opcional)</span>
                </label>
                {!closureFile ? (
                  <div
                    onDrop={(e) => { e.preventDefault(); setIsDraggingClosure(false); const f = e.dataTransfer.files?.[0]; if (f) setClosureFile(f) }}
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingClosure(true) }}
                    onDragLeave={() => setIsDraggingClosure(false)}
                    className="rounded-xl flex flex-col items-center justify-center text-center py-5 px-4 transition-all"
                    style={{
                      border: `2px dashed ${isDraggingClosure ? '#059669' : '#E2D9EE'}`,
                      background: isDraggingClosure ? 'rgba(5,150,105,.04)' : 'white',
                    }}
                  >
                    <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                         style={{ color: '#A090B0' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-xs text-ine-muted mb-2">Arrastra el archivo aquí o</p>
                    <label className="btn-outline cursor-pointer" style={{ padding: '6px 14px', fontSize: '12px' }}>
                      Seleccionar PDF
                      <input type="file" accept=".pdf" onChange={(e) => setClosureFile(e.target.files?.[0] || null)} className="sr-only" />
                    </label>
                    <p className="text-xs text-ine-dim mt-2">Solo PDF · Máximo 20MB</p>
                  </div>
                ) : (
                  <div className="rounded-lg p-3" style={{ border: '1px solid rgba(5,150,105,.3)', background: 'rgba(5,150,105,.04)' }}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-base flex-shrink-0">📄</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ine-text truncate">{closureFile.name}</p>
                        <p className="text-xs text-ine-dim">{formatFileSize(closureFile.size)}</p>
                      </div>
                      <button type="button" onClick={() => setClosureFile(null)}
                              className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                              style={{ color: '#B91C1C' }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220,38,38,.07)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: '#EDE8F4' }}>
                      <div className="h-full rounded-full" style={{ width: '100%', background: '#10B981' }} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* File attachments — only on create */}
          {!isEdit && (
            <div>
              <label className="ine-label">Archivos Adjuntos</label>

              {/* PIDI Drag & Drop zone */}
              <div
                onDrop={handleDropAttach}
                onDragOver={(e) => { e.preventDefault(); setIsDraggingAttach(true) }}
                onDragLeave={() => setIsDraggingAttach(false)}
                className="rounded-xl flex flex-col items-center justify-center text-center py-6 px-4 mb-4 transition-all"
                style={{
                  border: `2px dashed ${isDraggingAttach ? selectedDir.color : '#E2D9EE'}`,
                  background: isDraggingAttach ? selectedDir.color + '08' : 'white',
                }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                     style={{ background: '#F8F5FB' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                       style={{ color: '#582E73' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-xs text-ine-muted mb-3 leading-relaxed">
                  Arrastra aquí los archivos para subir o
                </p>
                <label className="btn-outline cursor-pointer" style={{ padding: '7px 16px', fontSize: '12px' }}>
                  Explora tus archivos
                  <input type="file" multiple onChange={handleFileSelect} className="sr-only" />
                </label>
                <p className="text-xs text-ine-dim mt-3">Máximo 20MB · PDF, DOCX, XLSX, JPG, PNG</p>
              </div>

              {/* PIDI Estatus de Carga */}
              {pendingFiles.length > 0 && (
                <div className="space-y-2">
                  {pendingFiles.map((file, i) => (
                    <div key={i} className="rounded-lg p-3" style={{ border: '1px solid #EDE8F4' }}>
                      <div className="flex items-center gap-2.5">
                        <span className="text-base flex-shrink-0">{getFileIcon(file.name)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-ine-text truncate">{file.name}</p>
                          <p className="text-xs text-ine-dim">{formatFileSize(file.size)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePendingFile(i)}
                          className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                          style={{ color: '#B91C1C' }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220,38,38,.07)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = ''}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: '#EDE8F4' }}>
                        <div className="h-full rounded-full" style={{ width: '100%', background: '#A090B0' }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3"
             style={{ background: '#F8F5FB', borderTop: '1px solid #E2D9EE' }}>
          {uploadStatus && (
            <p className="text-xs text-ine-muted flex items-center gap-1.5 sm:mr-auto">
              <span className="w-3 h-3 border-2 border-ine-purple border-t-transparent rounded-full animate-spin flex-shrink-0" />
              {uploadStatus}
            </p>
          )}
          <button type="button" onClick={onCancel} disabled={saving} className="btn-outline">
            Cancelar
          </button>
          <button type="submit" disabled={saving} className="btn-ine">
            {saving ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {uploadStatus ? 'Subiendo...' : 'Guardando...'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isEdit ? (isClosing ? 'Confirmar Cierre' : 'Guardar Cambios') : 'Crear Tarea'}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
