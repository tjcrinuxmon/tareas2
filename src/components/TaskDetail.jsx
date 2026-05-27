import React, { useState, useEffect, useCallback, useRef } from 'react'
import { getTask, addProgress, addComment, uploadFile, deleteFile, deleteTask, getTaskAssignments, closeTask, approveTask } from '../api.js'
import { getDireccion, STATUS_CONFIG, PRIORITY_CONFIG, formatDate, formatDateTime, formatFileSize, localToday } from '../constants.js'

function openAssignmentsPDF(task, assignments, dir) {
  const rows = assignments.map((a, i) => `
    <div class="step">
      <div class="step-num">${i + 1}</div>
      <div class="step-body">
        <div class="step-header">
          <span class="step-by">${a.assigned_by_name}</span>
          <span class="arrow">→</span>
          <span class="step-to">${a.assigned_to_name}</span>
        </div>
        <div class="step-date">${new Date(a.created_at.replace(' ', 'T')).toLocaleString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
      </div>
    </div>
  `).join('')

  const noHistory = `<p style="color:#6B5F78;font-size:13px;margin-top:8px;">Sin historial de asignaciones registrado.</p>`

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Historial de Asignaciones</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; color: #1A1219; padding: 40px; font-size: 13px; }
  .header { border-bottom: 3px solid #582E73; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { font-size: 17px; font-weight: 900; color: #582E73; }
  .brand small { display: block; font-size: 10px; font-weight: 400; color: #6B5F78; margin-top: 2px; }
  .print-date { font-size: 11px; color: #6B5F78; }
  .area-tag { display: inline-block; background: ${dir.color}18; color: ${dir.color}; border: 1px solid ${dir.color}40; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-bottom: 8px; }
  .task-title { font-size: 20px; font-weight: 900; color: #1A1219; margin-bottom: 4px; }
  .task-desc { color: #6B5F78; font-size: 12px; margin-bottom: 16px; }
  .meta-row { display: flex; gap: 24px; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #EDE8F4; }
  .meta-item label { font-size: 10px; text-transform: uppercase; color: #A090B0; font-weight: 700; display: block; margin-bottom: 2px; }
  .meta-item span { font-size: 12px; font-weight: 600; color: #1A1219; }
  .section-title { font-size: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: .06em; color: #582E73; margin-bottom: 12px; }
  .step { display: flex; gap: 12px; margin-bottom: 14px; }
  .step-num { width: 22px; height: 22px; border-radius: 50%; background: #582E73; color: white; font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
  .step-body { flex: 1; background: #F8F5FB; border: 1px solid #EDE8F4; border-radius: 8px; padding: 8px 12px; }
  .step-header { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .step-by { font-weight: 700; color: #1A1219; }
  .arrow { color: #582E73; font-weight: 900; font-size: 15px; }
  .step-to { font-weight: 700; color: #582E73; }
  .step-date { font-size: 11px; color: #6B5F78; margin-top: 3px; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #EDE8F4; font-size: 10px; color: #A090B0; text-align: center; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">INE · DEAJ<small>Dirección Ejecutiva de Asuntos Jurídicos</small></div>
    <div class="print-date">Impreso: ${new Date().toLocaleString('es-MX', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' })}</div>
  </div>

  <div class="area-tag">${dir.fullLabel}</div>
  <div class="task-title">${task.title}</div>
  ${task.description ? `<div class="task-desc">${task.description}</div>` : ''}

  <div class="meta-row">
    <div class="meta-item"><label>Estado</label><span>${STATUS_CONFIG[task.status]?.label || task.status}</span></div>
    <div class="meta-item"><label>Prioridad</label><span>${PRIORITY_CONFIG[task.priority]?.label || task.priority}</span></div>
    <div class="meta-item"><label>Vencimiento</label><span>${formatDate(task.week_date)}</span></div>
    <div class="meta-item"><label>Asignado a</label><span>${task.assignees?.map(a => a.name).join(', ') || task.assigned_to_name || 'Sin asignar'}</span></div>
  </div>

  <div class="section-title">Historial de Asignaciones</div>
  ${assignments.length ? rows : noHistory}

  <div class="footer">Sistema de Seguimiento de Tareas · INE · DEAJ · ${new Date().getFullYear()}</div>
</body>
</html>`

  const win = window.open('', '_blank', 'width=800,height=700')
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => win.print(), 400)
}

export default function TaskDetail({ taskId, onBack, onEdit, onDeleted, onRefresh, user }) {
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [progressContent, setProgressContent] = useState('')
  const [progressPct, setProgressPct] = useState(0)
  const [savingProgress, setSavingProgress] = useState(false)
  const [progressError, setProgressError] = useState(null)

  const [commentContent, setCommentContent] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const [commentError, setCommentError] = useState(null)

  const [uploadingFile, setUploadingFile] = useState(false)
  const [fileError, setFileError] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingClosure, setIsDraggingClosure] = useState(false)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [loadingPDF, setLoadingPDF] = useState(false)

  const [showCloseForm, setShowCloseForm] = useState(false)
  const closeFormRef = useRef(null)
  const [closureNotes, setClosureNotes] = useState('')
  const [closureDate, setClosureDate] = useState(localToday())
  const [closureFile, setClosureFile] = useState(null)
  const [savingClose, setSavingClose] = useState(false)
  const [closeError, setCloseError] = useState(null)

  const [showApproveForm, setShowApproveForm] = useState(false)
  const [approveNotes, setApproveNotes] = useState('')
  const [savingApprove, setSavingApprove] = useState(false)
  const [approveError, setApproveError] = useState(null)

  const fetchTask = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getTask(taskId)
      setTask(data)
      if (data.progress_updates?.length > 0) setProgressPct(data.progress_updates[0].percentage || 0)
    } catch {
      setError('No se pudo cargar la tarea.')
    } finally {
      setLoading(false)
    }
  }, [taskId])

  useEffect(() => { fetchTask() }, [fetchTask])

  useEffect(() => {
    setShowCloseForm(false)
    setClosureNotes('')
    setClosureDate(localToday())
    setClosureFile(null)
    setCloseError(null)
    setShowApproveForm(false)
    setApproveNotes('')
    setApproveError(null)
  }, [taskId])

  useEffect(() => {
    if (showCloseForm && closeFormRef.current) {
      setTimeout(() => closeFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [showCloseForm])

  const handleAddProgress = async (e) => {
    e.preventDefault()
    if (!progressContent.trim()) { setProgressError('El contenido del avance es requerido.'); return }
    setSavingProgress(true); setProgressError(null)
    try {
      const pct = progressPct
      await addProgress(taskId, { content: progressContent.trim(), percentage: pct })
      setProgressContent('')
      await fetchTask()
      onRefresh()
      if (pct === 100) {
        setShowCloseForm(true)
        setCloseError(null)
      }
    } catch { setProgressError('Error al registrar el avance.') }
    finally { setSavingProgress(false) }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!commentContent.trim()) { setCommentError('El comentario no puede estar vacío.'); return }
    setSavingComment(true); setCommentError(null)
    try {
      await addComment(taskId, { content: commentContent.trim(), author: user?.name || 'Directora Ejecutiva' })
      setCommentContent(''); await fetchTask(); onRefresh()
    } catch { setCommentError('Error al agregar el comentario.') }
    finally { setSavingComment(false) }
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFile(true); setFileError(null)
    try {
      await uploadFile(taskId, file); await fetchTask(); onRefresh()
    } catch { setFileError('Error al subir el archivo. Verifica que no supere 20MB.') }
    finally { setUploadingFile(false); e.target.value = '' }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    setUploadingFile(true); setFileError(null)
    try {
      await uploadFile(taskId, file); await fetchTask(); onRefresh()
    } catch { setFileError('Error al subir el archivo. Verifica que no supere 20MB.') }
    finally { setUploadingFile(false) }
  }

  const handleDeleteFile = async (attachmentId) => {
    if (!window.confirm('¿Eliminar este archivo?')) return
    try { await deleteFile(taskId, attachmentId); await fetchTask(); onRefresh() }
    catch { alert('Error al eliminar el archivo.') }
  }

  const handleDeleteTask = async () => {
    setDeleting(true)
    try { await deleteTask(taskId); onDeleted() }
    catch { alert('Error al eliminar la tarea.'); setDeleting(false); setConfirmDelete(false) }
  }

  const handleCloseTask = async (e) => {
    e.preventDefault()
    if (!closureNotes.trim()) { setCloseError('La síntesis de cierre es requerida.'); return }
    setSavingClose(true); setCloseError(null)
    try {
      const fd = new FormData()
      fd.append('closure_notes', closureNotes.trim())
      fd.append('closed_at', closureDate)
      if (closureFile) fd.append('file', closureFile)
      await closeTask(taskId, fd)
      setShowCloseForm(false)
      await fetchTask()
      onRefresh()
    } catch { setCloseError('Error al cerrar la tarea.') }
    finally { setSavingClose(false) }
  }

  const handleApprove = async (e) => {
    e.preventDefault()
    setSavingApprove(true); setApproveError(null)
    try {
      await approveTask(taskId, { notes: approveNotes.trim() })
      setShowApproveForm(false)
      setApproveNotes('')
      await fetchTask()
      onRefresh()
    } catch (err) { setApproveError(err?.response?.data?.error || 'Error al registrar el visto bueno.') }
    finally { setSavingApprove(false) }
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-10 h-10 border-4 rounded-full animate-spin mb-4"
           style={{ borderColor: '#E2D9EE', borderTopColor: '#582E73' }} />
      <p className="text-ine-muted text-sm">Cargando tarea...</p>
    </div>
  )

  if (error || !task) return (
    <div className="ine-card p-8 text-center max-w-lg mx-auto"
         style={{ border: '1.5px solid rgba(220,38,38,.22)' }}>
      <p className="font-semibold mb-3" style={{ color: '#B91C1C' }}>{error || 'Tarea no encontrada'}</p>
      <button onClick={onBack} className="text-sm text-ine-purple underline">Volver</button>
    </div>
  )

  const dir = getDireccion(task.direccion)

  // Unique areas from assignees; fall back to task.direccion for single-area tasks
  const assignedAreaDirs = task.assignees?.length > 0
    ? [...new Map(
        task.assignees.filter(a => a.direccion).map(a => [a.direccion, getDireccion(a.direccion)])
      ).values()]
    : [dir]
  const isMultiArea = assignedAreaDirs.length > 1

  const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.pendiente
  const prioCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media
  const latestPct = task.closed_at ? 100 : (task.progress_updates?.[0]?.percentage ?? 0)
  const today = localToday()
  const isVencida = !task.closed_at && task.status !== 'completada' && task.week_date < today

  const getFileIcon = (fn) => {
    const ext = fn.split('.').pop().toLowerCase()
    if (ext === 'pdf') return '📄'
    if (['doc','docx'].includes(ext)) return '📝'
    if (['xls','xlsx'].includes(ext)) return '📊'
    if (['jpg','jpeg','png','gif','webp'].includes(ext)) return '🖼️'
    if (['zip','rar','7z'].includes(ext)) return '📦'
    return '📎'
  }

  const isEjecutiva = user?.role === 'ejecutiva'
  const isCreator = task?.created_by_id === user?.id
  const isPrivileged = user?.role === 'ejecutiva' || user?.role === 'admin'
  const isClosed = task?.status === 'completada' || !!task?.closed_at
  const canDelete = (isPrivileged || isCreator) && !isClosed
  const isAssignee = task?.assignees?.some(a => a.id === user?.id) || task?.assigned_to === user?.id
  const canComment = !isClosed && (isPrivileged ||
    (user?.role === 'director' && (task?.direccion === user?.direccion || isAssignee)) ||
    (user?.role === 'subdirector' && isAssignee))

  // Multi-assignee task not created by current user → each assignee informs individually
  const canFullClose = isPrivileged || isCreator
  const isMultiAssignee = (task.assignees?.length || 0) > 1
  const mustDoAreaClosure = isMultiAssignee && !canFullClose

  // Director visto bueno logic — only count subdirector assignees, never the director themselves
  const myAreaAssignees = task.assignees?.filter(a => a.direccion === user?.direccion && a.role === 'subdirector') || []
  const myAreaAllClosed = myAreaAssignees.length > 0 &&
    myAreaAssignees.every(a => task.area_closures?.some(c => c.user_id === a.id))
  const myApprovalExists = task.director_approvals?.some(a => a.area_key === user?.direccion)
  const directorHasAreaAssignees = user?.role === 'director' && mustDoAreaClosure && myAreaAssignees.length > 0
  const canApprove = directorHasAreaAssignees && myAreaAllClosed && !myApprovalExists && !task.closed_at

  const myClosureExists = mustDoAreaClosure && !directorHasAreaAssignees && task.area_closures?.some(c => c.user_id === user?.id)
  const canClose = canComment && !task.closed_at && !myClosureExists && !directorHasAreaAssignees

  // Progress bar color: blue = all direct closers done + awaiting visto bueno, green = done
  const totalSubdirs = task.assignees?.filter(a => a.role === 'subdirector').length || 0
  // Only count subdirector closures (not director direct-closures) against subdirector total
  const closedSubdirs = task.area_closures?.filter(c =>
    task.assignees?.some(a => a.id === c.user_id && a.role === 'subdirector')
  )?.length || 0
  // Director-only areas: areas where a director is assigned but no subdirectors
  const dirOnlyAreas = assignedAreaDirs.filter(d =>
    task.assignees?.some(a => a.direccion === d.key && a.role === 'director') &&
    !task.assignees?.some(a => a.direccion === d.key && a.role === 'subdirector')
  )
  const allDirOnlyAreasClosed = dirOnlyAreas.length === 0 || dirOnlyAreas.every(d => {
    const dirUser = task.assignees?.find(a => a.direccion === d.key && a.role === 'director')
    return dirUser && task.area_closures?.some(c => c.user_id === dirUser.id)
  })
  // Areas that need visto bueno = areas with subdirectors assigned
  const areasNeedingApproval = assignedAreaDirs.filter(d =>
    task.assignees?.some(a => a.direccion === d.key && a.role === 'subdirector')
  )
  const approvedAreas = task.director_approvals?.length || 0
  const totalAreaCount = areasNeedingApproval.length  // only areas needing visto bueno
  const allDirectClosersDone = mustDoAreaClosure && totalSubdirs > 0 && closedSubdirs >= totalSubdirs && allDirOnlyAreasClosed
  const allApproved = mustDoAreaClosure && allDirectClosersDone &&
    (totalAreaCount === 0 || approvedAreas >= totalAreaCount)
  const progressBarColor = task.closed_at || allApproved
    ? '#059669'
    : allDirectClosersDone
      ? '#2563EB'
      : (latestPct === 100 ? '#059669' : dir.color)

  const handleDownloadPDF = async () => {
    setLoadingPDF(true)
    try {
      const assignments = await getTaskAssignments(taskId)
      openAssignmentsPDF(task, assignments, dir)
    } finally {
      setLoadingPDF(false)
    }
  }

  const handleShareEmail = () => {
    const prioCfgLocal = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media
    const lines = [
      `Tarea: ${task.title}`,
      `Dirección: ${dir.fullLabel}`,
      `Vence: ${formatDate(task.week_date)}`,
      `Estado: ${statusCfg.label}`,
      `Prioridad: ${prioCfgLocal.label}`,
      `Avance: ${latestPct}%`,
      task.description ? `\nDescripción:\n${task.description}` : '',
      `\n— Sistema de Seguimiento de Tareas · INE · DEAJ`,
    ].filter(Boolean).join('\n')
    window.location.href = `mailto:?subject=${encodeURIComponent(`[DEAJ] Tarea: ${task.title}`)}&body=${encodeURIComponent(lines)}`
  }

  return (
    <div className="fade-in max-w-4xl mx-auto">

      {/* Task header */}
      <div className="ine-card overflow-hidden mb-5">
        {isMultiArea
          ? <div className="h-1.5 w-full flex">
              {assignedAreaDirs.map(d => (
                <div key={d.key} className="flex-1 h-full" style={{ background: d.color }} />
              ))}
            </div>
          : <div className="h-1.5" style={{ background: dir.color }} />
        }
        <div className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {assignedAreaDirs.map(d => (
                  <div key={d.key} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold"
                       style={{ background: d.color + '15', color: d.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    {d.label}
                  </div>
                ))}
              </div>
              <h1 className="text-xl font-bold text-ine-text mb-2">{task.title}</h1>
              {task.description && (
                <p className="text-sm text-ine-muted leading-relaxed mb-4">{task.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-xs text-ine-muted">
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {formatDate(task.week_date)}
                </span>
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Creada el {formatDateTime(task.created_at)}
                </span>
                {task.closed_at && (
                  <span className="flex items-center gap-1.5 font-semibold" style={{ color: '#059669' }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Cerrada el {formatDate(task.closed_at)}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border"
                    style={{ background: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.border }}>
                <span className="w-2 h-2 rounded-full" style={{ background: statusCfg.color }} />
                {statusCfg.label}
              </span>
              {isVencida && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border"
                      style={{ background: 'rgba(220,38,38,.09)', color: '#DC2626', borderColor: 'rgba(220,38,38,.25)' }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: '#DC2626' }} />
                  Vencida
                </span>
              )}
              {task.closed_at && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border"
                      style={{ background: '#DCFCE7', color: '#059669', borderColor: '#86EFAC' }}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Cerrada
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border"
                    style={{ background: prioCfg.bg, color: prioCfg.color, borderColor: prioCfg.border }}>
                {prioCfg.icon} Prioridad {prioCfg.label}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleShareEmail}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                  style={{ background: 'rgba(88,46,115,.07)', border: '1px solid rgba(88,46,115,.22)', color: '#582E73' }}
                  title="Compartir por correo"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Compartir
                </button>
                {!task.closed_at && (
                  <button
                    onClick={() => onEdit(task)}
                    className="btn-outline"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar
                  </button>
                )}
                {canClose && (
                  <button
                    onClick={() => { setShowCloseForm(!showCloseForm); setCloseError(null) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                    style={{ background: showCloseForm ? 'rgba(220,38,38,.07)' : 'rgba(5,150,105,.09)', border: showCloseForm ? '1px solid rgba(220,38,38,.25)' : '1px solid rgba(5,150,105,.3)', color: showCloseForm ? '#B91C1C' : '#059669' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    {showCloseForm ? 'Cancelar' : (mustDoAreaClosure ? 'Informar cierre' : 'Cerrar Tarea')}
                  </button>
                )}
                {canApprove && (
                  <button
                    onClick={() => { setShowApproveForm(!showApproveForm); setApproveError(null) }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                    style={showApproveForm
                      ? { background: 'rgba(220,38,38,.07)', border: '1px solid rgba(220,38,38,.25)', color: '#B91C1C' }
                      : { background: 'rgba(37,99,235,.09)', border: '1px solid rgba(37,99,235,.3)', color: '#1D4ED8' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {showApproveForm ? 'Cancelar' : 'Dar visto bueno'}
                  </button>
                )}
                {canDelete && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors"
                    style={{ background: 'rgba(220,38,38,.07)', border: '1px solid rgba(220,38,38,.22)', color: '#B91C1C' }}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 pt-4" style={{ borderTop: '1px solid #EDE8F4' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-ine-text">Progreso general</span>
              <div className="flex items-center gap-2">
              {allDirectClosersDone && !allApproved && totalAreaCount > 0 && (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(37,99,235,.1)', color: '#1D4ED8' }}>
                  Pendiente visto bueno
                </span>
              )}
              <span className="text-sm font-bold" style={{ color: progressBarColor }}>{latestPct}%</span>
            </div>
            </div>
            <div className="h-3 rounded-full overflow-hidden" style={{ background: '#EDE8F4' }}>
              <div className="h-full rounded-full progress-bar-fill"
                   style={{ width: `${latestPct}%`, background: progressBarColor }} />
            </div>
          </div>
        </div>
      </div>

      {/* Close form */}
      {showCloseForm && (
        <div ref={closeFormRef} className="ine-card overflow-hidden mb-5" style={{ border: '1.5px solid rgba(5,150,105,.3)', borderTop: '3px solid #059669' }}>
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(5,150,105,.15)', background: 'rgba(5,150,105,.04)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(5,150,105,.12)', color: '#059669' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-ine-text">
              {mustDoAreaClosure ? 'Informar Cierre de Área' : 'Formulario de Cierre'}
            </h2>
          </div>
          <form onSubmit={handleCloseTask} className="p-5">
            {closeError && <ErrorBox msg={closeError} />}
            <div className="mb-4">
              <label className="ine-label mb-1.5 block">Síntesis del cierre <span style={{ color: '#B91C1C' }}>*</span></label>
              <textarea
                value={closureNotes}
                onChange={(e) => setClosureNotes(e.target.value)}
                placeholder="Describe brevemente cómo se resolvió o cerró esta actividad..."
                rows={4}
                className="ine-input"
                style={{ resize: 'none' }}
              />
            </div>
            <div className="mb-4">
              <label className="ine-label mb-1.5 block">Fecha de cierre</label>
              <input
                type="date"
                value={closureDate}
                onChange={(e) => setClosureDate(e.target.value)}
                min={localToday()}
                className="ine-input"
              />
            </div>
            <div className="mb-5">
              <label className="ine-label block">
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
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowCloseForm(false); setCloseError(null) }}
                      className="btn-outline flex-1 justify-center">
                Cancelar
              </button>
              <button type="submit" disabled={savingClose}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-colors disabled:opacity-60"
                      style={{ background: '#059669' }}>
                {savingClose
                  ? <><Spinner />Cerrando...</>
                  : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>Confirmar Cierre</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Visto bueno form */}
      {showApproveForm && (
        <div className="ine-card overflow-hidden mb-5" style={{ border: '1.5px solid rgba(37,99,235,.3)', borderTop: '3px solid #2563EB' }}>
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(37,99,235,.15)', background: 'rgba(37,99,235,.04)' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(37,99,235,.12)', color: '#2563EB' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-ine-text">Visto Bueno — {getDireccion(user?.direccion)?.fullLabel}</h2>
          </div>
          <form onSubmit={handleApprove} className="p-5">
            {approveError && <ErrorBox msg={approveError} />}
            <div className="mb-4">
              <label className="ine-label mb-1.5 block">Observaciones o validación</label>
              <textarea
                value={approveNotes}
                onChange={(e) => setApproveNotes(e.target.value)}
                placeholder="Valida que los cierres son correctos..."
                rows={3}
                className="ine-input"
                style={{ resize: 'none' }}
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowApproveForm(false); setApproveError(null) }}
                      className="btn-outline flex-1 justify-center">Cancelar</button>
              <button type="submit" disabled={savingApprove}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg disabled:opacity-60"
                      style={{ background: '#2563EB' }}>
                {savingApprove
                  ? <><Spinner />Guardando...</>
                  : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>Confirmar visto bueno</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Multi-assignee closure status panel */}
      {isMultiAssignee && (
        <div className="ine-card overflow-hidden mb-5" style={{ border: '1.5px solid rgba(124,58,237,.22)', borderTop: '3px solid #7C3AED' }}>
          <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid #EDE8F4' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(124,58,237,.09)', color: '#7C3AED' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h2 className="text-sm font-bold text-ine-text">
              {canFullClose ? 'Cierre por Asignado' : 'Informes de Cierre por Área'}
            </h2>
            {totalAreaCount > 0 && (
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: 'rgba(124,58,237,.09)', color: '#7C3AED' }}>
                {approvedAreas} / {totalAreaCount} con visto bueno
              </span>
            )}
          </div>
          <div className="p-5 space-y-4">
            {assignedAreaDirs.map(d => {
              const areaSubdirAssignees = task.assignees.filter(a => a.direccion === d.key && a.role === 'subdirector')
              const areaDirUser = task.assignees.find(a => a.direccion === d.key && a.role === 'director')
              const isDirOnlyArea = areaSubdirAssignees.length === 0 && !!areaDirUser

              // For director-only areas, track the director's closure directly
              const dirClosure = isDirOnlyArea ? task.area_closures?.find(c => c.user_id === areaDirUser.id) : null
              const areaAssignees = isDirOnlyArea ? [] : areaSubdirAssignees
              const areaClosures = areaAssignees.map(a => task.area_closures?.find(c => c.user_id === a.id))
              const areaClosedCount = isDirOnlyArea ? (dirClosure ? 1 : 0) : areaClosures.filter(Boolean).length
              const areaAllClosed = isDirOnlyArea ? !!dirClosure : (areaClosedCount >= areaAssignees.length && areaAssignees.length > 0)
              const approval = isDirOnlyArea ? null : task.director_approvals?.find(a => a.area_key === d.key)
              const borderColor = isDirOnlyArea
                ? (dirClosure ? 'rgba(5,150,105,.25)' : '#EDE8F4')
                : (approval ? 'rgba(5,150,105,.25)' : areaAllClosed ? 'rgba(37,99,235,.25)' : '#EDE8F4')
              const headerBg = isDirOnlyArea
                ? (dirClosure ? 'rgba(5,150,105,.05)' : '#F8F5FB')
                : (approval ? 'rgba(5,150,105,.05)' : areaAllClosed ? 'rgba(37,99,235,.05)' : '#F8F5FB')

              return (
                <div key={d.key} className="rounded-xl overflow-hidden"
                     style={{ border: `1.5px solid ${borderColor}` }}>
                  {/* Area header */}
                  <div className="flex items-center justify-between gap-2 px-3 py-2"
                       style={{ background: headerBg }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-sm font-bold text-ine-text">{d.fullLabel}</span>
                    </div>
                    <span className="text-xs font-semibold" style={{ color: areaAllClosed ? '#059669' : '#92400E' }}>
                      {isDirOnlyArea
                        ? (dirClosure ? '✓ Director cerró' : 'Director pendiente')
                        : `${areaClosedCount}/${areaAssignees.length} cerraron`}
                    </span>
                  </div>

                  {/* Rows: subdirectors (normal) OR director row (director-only area) */}
                  <div className="px-3 py-2 space-y-2" style={{ borderBottom: isDirOnlyArea ? 'none' : '1px solid #EDE8F4' }}>
                    {isDirOnlyArea ? (
                      /* Director-only: show the director as the direct closer */
                      <div>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5">
                            <svg className="w-3 h-3 flex-shrink-0" style={{ color: d.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                            <span className="text-xs font-medium text-ine-text">{areaDirUser.puesto || areaDirUser.name}</span>
                          </div>
                          {dirClosure ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                                  style={{ background: 'rgba(5,150,105,.12)', color: '#059669' }}>
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                              </svg>
                              Cerrado {formatDate(dirClosure.closure_date)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                                  style={{ background: 'rgba(217,119,6,.10)', color: '#92400E' }}>
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#D97706' }} />
                              Pendiente
                            </span>
                          )}
                        </div>
                        {dirClosure?.closure_notes && (
                          <p className="mt-1 text-xs text-ine-dim leading-relaxed pl-5">{dirClosure.closure_notes}</p>
                        )}
                      </div>
                    ) : areaAssignees.map(assignee => {
                      const closure = task.area_closures?.find(c => c.user_id === assignee.id)
                      return (
                        <div key={assignee.id}>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <svg className="w-3 h-3 flex-shrink-0" style={{ color: d.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="text-xs font-medium text-ine-text">{assignee.puesto || assignee.name}</span>
                            </div>
                            {closure ? (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(5,150,105,.12)', color: '#059669' }}>
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                                Informado {formatDate(closure.closure_date)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                                    style={{ background: 'rgba(217,119,6,.10)', color: '#92400E' }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#D97706' }} />
                                Pendiente
                              </span>
                            )}
                          </div>
                          {closure?.closure_notes && (
                            <p className="mt-1 text-xs text-ine-dim leading-relaxed pl-5">{closure.closure_notes}</p>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {/* Director approval row — only for areas with subdirectors */}
                  {!isDirOnlyArea && (
                    <div className="px-3 py-2 flex items-center justify-between gap-2"
                         style={{ background: approval ? 'rgba(5,150,105,.04)' : areaAllClosed ? 'rgba(37,99,235,.04)' : 'white' }}>
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: approval ? '#059669' : '#6B5F78' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs font-semibold" style={{ color: approval ? '#059669' : '#6B5F78' }}>
                          Visto bueno del Director
                        </span>
                      </div>
                      {approval ? (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(5,150,105,.12)', color: '#059669' }}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                            </svg>
                            {approval.director_name} — {formatDate(approval.approved_at)}
                          </span>
                          {approval.notes && (
                            <p className="text-xs text-ine-dim mt-1 text-right">{approval.notes}</p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: areaAllClosed ? 'rgba(37,99,235,.1)' : 'rgba(217,119,6,.10)', color: areaAllClosed ? '#1D4ED8' : '#92400E' }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: areaAllClosed ? '#2563EB' : '#D97706' }} />
                          {areaAllClosed ? 'Pendiente visto bueno' : 'Pendiente cierres'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Closure info banner */}
      {task.closed_at && (
        <div className="ine-card overflow-hidden mb-5" style={{ border: '1.5px solid rgba(5,150,105,.25)', borderTop: '3px solid #059669' }}>
          <div className="p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                   style={{ background: 'rgba(5,150,105,.12)', color: '#059669' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-bold" style={{ color: '#059669' }}>Actividad Cerrada</span>
                <span className="text-xs text-ine-dim ml-2">el {formatDate(task.closed_at)}</span>
              </div>
            </div>
            {task.closure_notes && (
              <div className="rounded-lg p-3 mb-3 text-sm text-ine-text leading-relaxed"
                   style={{ background: 'rgba(5,150,105,.06)', border: '1px solid rgba(5,150,105,.15)' }}>
                {task.closure_notes}
              </div>
            )}
            {task.closure_filename && (
              <a href={`/uploads/t2/${task.closure_filename}`} download={task.closure_original_name}
                 className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                 style={{ background: 'rgba(5,150,105,.09)', color: '#059669', border: '1px solid rgba(5,150,105,.25)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                {task.closure_original_name || 'Descargar evidencia PDF'}
              </a>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: Progress + Comments */}
        <div className="lg:col-span-2 space-y-5">

          {/* Progress Updates */}
          <section className="ine-card overflow-hidden">
            <SectionHeader
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>}
              iconBg="rgba(37,99,235,.09)"
              iconColor="#1D4ED8"
              title="Registro de Avances"
              count={task.progress_updates?.length}
            />

            {/* Add progress form — locked when task is closed or director in visto-bueno mode */}
            {task.closed_at ? (
              <div className="p-4" style={{ borderBottom: '1px solid #EDE8F4', background: '#F0FDF4' }}>
                <div className="flex items-center gap-2 text-sm" style={{ color: '#059669' }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="font-semibold">Actividad cerrada — avance bloqueado al 100%</span>
                </div>
              </div>
            ) : directorHasAreaAssignees ? (
              <div className="p-4" style={{ borderBottom: '1px solid #EDE8F4', background: '#EFF6FF' }}>
                <div className="flex items-center gap-2 text-sm" style={{ color: '#2563EB' }}>
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-semibold">El avance lo registran los subdirectores — usa el visto bueno para validar</span>
                </div>
              </div>
            ) : (
              <form onSubmit={handleAddProgress} className="p-5" style={{ borderBottom: '1px solid #EDE8F4', background: '#F8F5FB' }}>
                <p className="ine-label mb-3">Agregar Avance</p>
                {progressError && <ErrorBox msg={progressError} />}
                <textarea
                  value={progressContent}
                  onChange={(e) => setProgressContent(e.target.value)}
                  placeholder="Describe el avance realizado..."
                  rows={3}
                  className="ine-input mb-3"
                  style={{ resize: 'none' }}
                />
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="ine-label mb-0">Porcentaje de avance</span>
                    <span className="text-sm font-bold"
                          style={{ color: progressPct === 100 ? '#059669' : dir.color }}>{progressPct}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5}
                    value={progressPct}
                    onChange={(e) => setProgressPct(Number(e.target.value))}
                    className="w-full h-2"
                    style={{ accentColor: dir.color }}
                  />
                  <div className="flex justify-between text-xs text-ine-dim mt-1">
                    {['0%','25%','50%','75%','100%'].map(v => <span key={v}>{v}</span>)}
                  </div>
                </div>
                <button type="submit" disabled={savingProgress} className="btn-ine"
                        style={{ background: dir.color, boxShadow: `0 3px 10px ${dir.color}44` }}>
                  {savingProgress
                    ? <><Spinner />Guardando...</>
                    : <><PlusIcon />Registrar Avance</>}
                </button>
              </form>
            )}

            {/* Timeline */}
            <div className="p-5">
              {!task.progress_updates?.length
                ? <p className="text-sm text-ine-dim text-center py-4">Aún no hay avances registrados.</p>
                : <div className="space-y-4">
                    {task.progress_updates.map((up, i) => (
                      <div key={up.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                               style={{ background: up.percentage === 100 ? '#059669' : dir.color }}>
                            {up.percentage}%
                          </div>
                          {i < task.progress_updates.length - 1 && (
                            <div className="w-px flex-1 mt-1" style={{ background: '#E2D9EE' }} />
                          )}
                        </div>
                        <div className="flex-1 pb-4">
                          <p className="text-sm text-ine-text mb-1 leading-relaxed">{up.content}</p>
                          <p className="text-xs text-ine-dim">{formatDateTime(up.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </section>

          {/* Comments */}
          <section className="ine-card overflow-hidden">
            <SectionHeader
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>}
              iconBg="rgba(228,0,123,.08)"
              iconColor="#E4007B"
              title="Comentarios"
              count={task.comments?.length}
            />

            {canComment && (
              <form onSubmit={handleAddComment} className="p-5" style={{ borderBottom: '1px solid #EDE8F4', background: 'rgba(228,0,123,.03)' }}>
                <p className="ine-label mb-3">Agregar Comentario</p>
                {commentError && <ErrorBox msg={commentError} />}
                <textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Escribe un comentario o instrucción..."
                  rows={3}
                  className="ine-input mb-3"
                  style={{ resize: 'none' }}
                />
                <button type="submit" disabled={savingComment} className="btn-mg">
                  {savingComment
                    ? <><Spinner />Enviando...</>
                    : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>Agregar Comentario</>}
                </button>
              </form>
            )}

            <div className="p-5">
              {!task.comments?.length
                ? <p className="text-sm text-ine-dim text-center py-4">
                    {canComment ? 'Aún no hay comentarios.' : 'Sin comentarios.'}
                  </p>
                : <div className="space-y-4">
                    {task.comments.map((c) => (
                      <div key={c.id} className="flex gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                             style={{ background: '#E4007B' }}>
                          {c.author?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-ine-text">{c.author}</span>
                            <span className="text-xs text-ine-dim">{formatDateTime(c.created_at)}</span>
                          </div>
                          <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(228,0,123,.06)', border: '1px solid rgba(228,0,123,.15)' }}>
                            <p className="text-sm text-ine-text leading-relaxed">{c.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </section>
        </div>

        {/* Right: Attachments + Metadata */}
        <div className="space-y-5">
          <section className="ine-card overflow-hidden">
            <SectionHeader
              icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>}
              iconBg="#F8F5FB"
              iconColor="#582E73"
              title="Archivos Adjuntos"
              count={task.attachments?.length}
            />

            <div className="p-5">
              {fileError && <ErrorBox msg={fileError} />}

              {/* PIDI Drag & Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                className="rounded-xl flex flex-col items-center justify-center text-center py-6 px-4 mb-4 transition-all"
                style={{
                  border: `2px dashed ${isDragging ? '#582E73' : '#E2D9EE'}`,
                  background: isDragging ? 'rgba(88,46,115,.05)' : 'white',
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
                  {uploadingFile ? 'Subiendo archivo...' : 'Arrastra aquí los archivos para subir o'}
                </p>
                <label className={`btn-outline cursor-pointer ${uploadingFile ? 'opacity-50 pointer-events-none' : ''}`}
                       style={{ padding: '7px 16px', fontSize: '12px' }}>
                  {uploadingFile
                    ? <><Spinner color="#D5007F" />Subiendo...</>
                    : 'Explora tus archivos'
                  }
                  <input type="file" onChange={handleFileUpload} disabled={uploadingFile} className="sr-only" />
                </label>
                <p className="text-xs text-ine-dim mt-3">Máximo 20MB · PDF, DOCX, XLSX, JPG, PNG</p>
              </div>

              {/* PIDI Estatus de Carga */}
              {!task.attachments?.length
                ? <p className="text-sm text-ine-dim text-center py-2">No hay archivos adjuntos.</p>
                : <div className="space-y-2">
                    {task.attachments.map((att) => (
                      <div key={att.id} className="rounded-lg p-3 transition-colors"
                           style={{ border: '1px solid #EDE8F4' }}>
                        <div className="flex items-center gap-2.5">
                          <span className="text-base flex-shrink-0">{getFileIcon(att.original_name)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-ine-text truncate">{att.original_name}</p>
                            <p className="text-xs text-ine-dim">{formatFileSize(att.size)}</p>
                          </div>
                          <div className="flex gap-1 flex-shrink-0">
                            <a href={`/uploads/t2/${att.filename}`} download={att.original_name}
                               className="p-1.5 rounded-lg text-ine-purple hover:bg-ine-bg transition-colors" title="Descargar">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                              </svg>
                            </a>
                            <button onClick={() => handleDeleteFile(att.id)}
                                    className="p-1.5 rounded-lg transition-colors" title="Eliminar"
                                    style={{ color: '#DC2626' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220,38,38,.07)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: '#EDE8F4' }}>
                          <div className="h-full rounded-full progress-bar-fill" style={{ width: '100%', background: '#10B981' }} />
                        </div>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </section>

          {/* Metadata */}
          <section className="ine-card p-5">
            <p className="ine-label mb-3">Detalles</p>
            <div className="space-y-3 text-sm">
              {[
                ['ID', `#${task.id}`, true],
                ['Creada por', task.created_by_name || '—', false],
                ['Creada', formatDateTime(task.created_at), false],
                ['Actualizada', formatDateTime(task.updated_at), false],
                task.closed_at ? ['Cerrada', formatDate(task.closed_at), false] : null,
                ['Avances', task.progress_updates?.length || 0, false],
                ['Comentarios', task.comments?.length || 0, false],
              ].filter(Boolean).map(([label, value, mono]) => (
                <div key={label}>
                  <p className="text-xs text-ine-dim mb-0.5">{label}</p>
                  <p className={`text-ine-text font-medium ${mono ? 'font-mono' : ''}`} style={{ fontSize: '13px' }}>
                    {value}
                  </p>
                </div>
              ))}
              <div>
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <p className="text-xs text-ine-dim">Asignado a</p>
                  <button
                    onClick={handleDownloadPDF}
                    disabled={loadingPDF}
                    title="Descargar historial de asignaciones (PDF)"
                    className="flex items-center gap-1 text-xs font-semibold transition-colors rounded px-1.5 py-0.5"
                    style={{ color: '#582E73', background: '#F8F5FB', border: '1px solid #E2D9EE' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#EDE8F4' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#F8F5FB' }}
                  >
                    {loadingPDF ? (
                      <span className="w-3 h-3 border border-ine-purple border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h4a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      </svg>
                    )}
                    PDF
                  </button>
                </div>
                {(task.assignees?.length > 0 || task.assigned_to_name) ? (
                  <div className="flex flex-col gap-2">
                    {assignedAreaDirs.map(d => {
                      const areaAssignees = task.assignees.filter(a => a.direccion === d.key)
                      return (
                        <div key={d.key}>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                            <span className="text-ine-text font-semibold" style={{ fontSize: '13px' }}>{d.fullLabel}</span>
                          </div>
                          {areaAssignees.map(a => (
                            <div key={a.id} className="flex items-center gap-1.5 mt-1 ml-4">
                              <svg className="w-3 h-3 flex-shrink-0" style={{ color: d.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="text-ine-muted" style={{ fontSize: '12px' }}>
                                {a.puesto || a.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-ine-dim font-medium" style={{ fontSize: '13px' }}>Sin asignar</p>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Delete modal */}
      {confirmDelete && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
             style={{ background: 'rgba(42,18,57,.45)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-xl max-w-sm w-full p-6 fade-in"
               style={{ border: '1.5px solid #E2D9EE', borderTop: '4px solid #DC2626', boxShadow: '0 20px 60px rgba(88,46,115,.20)' }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
                 style={{ background: 'rgba(220,38,38,.09)' }}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                   style={{ color: '#DC2626' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-ine-text text-center mb-2">¿Eliminar esta tarea?</h3>
            <p className="text-sm text-ine-muted text-center mb-6">
              Esta acción no se puede deshacer. Se eliminarán todos los avances, comentarios y archivos asociados.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(false)} disabled={deleting} className="btn-outline flex-1 justify-center">
                Cancelar
              </button>
              <button onClick={handleDeleteTask} disabled={deleting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60"
                      style={{ background: '#DC2626' }}>
                {deleting ? <><Spinner />Eliminando...</> : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ icon, iconBg, iconColor, title, count }) {
  return (
    <div className="px-5 py-4 flex items-center gap-2" style={{ borderBottom: '1px solid #EDE8F4' }}>
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ background: iconBg, color: iconColor }}>
        {icon}
      </div>
      <h2 className="text-sm font-bold text-ine-text">{title}</h2>
      {count > 0 && (
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ background: iconBg, color: iconColor }}>{count}</span>
      )}
    </div>
  )
}

function ErrorBox({ msg }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs"
         style={{ background: 'rgba(220,38,38,.07)', border: '1px solid rgba(220,38,38,.22)', color: '#B91C1C' }}>
      {msg}
    </div>
  )
}

function Spinner({ color = 'white' }) {
  return <div className="w-3.5 h-3.5 border-2 border-t-transparent rounded-full animate-spin flex-shrink-0"
              style={{ borderColor: color, borderTopColor: 'transparent' }} />
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  )
}
