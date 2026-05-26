import axios from 'axios'
import { getToken, clearAuth } from './auth.js'

const BASE = '/api/t2'

const api = axios.create({ baseURL: BASE, timeout: 30000 })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearAuth()
      window.location.reload()
    }
    return Promise.reject(err)
  }
)

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then((r) => r.data)

// ─── TASKS ────────────────────────────────────────────────────────────────────

export const getTasks = (params = {}) =>
  api.get('/tasks', { params }).then((r) => r.data)

export const createTask = (data) =>
  api.post('/tasks', data).then((r) => r.data)

export const getTask = (id) =>
  api.get(`/tasks/${id}`).then((r) => r.data)

export const updateTask = (id, data) =>
  api.put(`/tasks/${id}`, data).then((r) => r.data)

export const deleteTask = (id) =>
  api.delete(`/tasks/${id}`).then((r) => r.data)

export const closeTask = (id, formData) =>
  api.post(`/tasks/${id}/close`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)

export const approveTask = (id, data) =>
  api.post(`/tasks/${id}/approve`, data).then((r) => r.data)

// ─── PROGRESS ─────────────────────────────────────────────────────────────────

export const addProgress = (taskId, data) =>
  api.post(`/tasks/${taskId}/progress`, data).then((r) => r.data)

export const getTaskAssignments = (taskId) =>
  api.get(`/tasks/${taskId}/assignments`).then((r) => r.data)

// ─── COMMENTS ─────────────────────────────────────────────────────────────────

export const addComment = (taskId, data) =>
  api.post(`/tasks/${taskId}/comments`, data).then((r) => r.data)

// ─── ATTACHMENTS ──────────────────────────────────────────────────────────────

export const uploadFile = (taskId, file) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post(`/tasks/${taskId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data)
}

export const deleteFile = (taskId, attachmentId) =>
  api.delete(`/tasks/${taskId}/files/${attachmentId}`).then((r) => r.data)

// ─── REPORT ───────────────────────────────────────────────────────────────────

export const getReport = (params = {}) =>
  api.get('/report', { params }).then((r) => r.data)

// ─── USERS ────────────────────────────────────────────────────────────────────

export const getUsers = () =>
  api.get('/users').then((r) => r.data)

// ─── ADMIN / USERS ────────────────────────────────────────────────────────────

export const adminGetUsers    = ()         => api.get('/admin/users').then((r) => r.data)
export const adminCreateUser  = (data)     => api.post('/admin/users', data).then((r) => r.data)
export const adminUpdateUser  = (id, data) => api.put(`/admin/users/${id}`, data).then((r) => r.data)
export const adminDeleteUser  = (id)       => api.delete(`/admin/users/${id}`).then((r) => r.data)

// ─── ENLACE / DIARIO ──────────────────────────────────────────────────────────

export const getInhabilDays    = ()             => api.get('/inhabil-days').then(r => r.data)
export const addInhabilDay     = (date, reason) => api.post('/inhabil-days', { date, reason }).then(r => r.data)
export const removeInhabilDay  = (date)         => api.delete(`/inhabil-days/${encodeURIComponent(date)}`).then(r => r.data)

export const getEnlacePending   = ()           => api.get('/enlace/pending').then(r => r.data)
export const getEnlaceCompleted = ()           => api.get('/enlace/completed').then(r => r.data)
export const getEnlaceMatrix    = (weekStart)  => api.get('/enlace/matrix', { params: weekStart ? { week_start: weekStart } : {} }).then(r => r.data)
export const markDailyReport    = (status, report_date, report_type = 'solicitudes') => api.post('/daily-reports', { status, report_date, report_type }).then(r => r.data)
export const getMyDailyReports  = ()           => api.get('/daily-reports/me').then(r => r.data)

// ─── CONVENIOS ────────────────────────────────────────────────────────────────

export const getConvenios    = ()         => api.get('/convenios').then(r => r.data)
export const createConvenio  = (data)     => api.post('/convenios', data).then(r => r.data)
export const updateConvenio  = (id, data) => api.put(`/convenios/${id}`, data).then(r => r.data)
export const deleteConvenio  = (id)       => api.delete(`/convenios/${id}`).then(r => r.data)

// ─── DAL (Asuntos Laborales) ──────────────────────────────────────────────────
export const getDalSection   = (section)          => api.get(`/dal/${section}`).then(r => r.data)
export const createDalRecord = (section, data)     => api.post(`/dal/${section}`, data).then(r => r.data)
export const updateDalRecord = (section, id, data) => api.put(`/dal/${section}/${id}`, data).then(r => r.data)
export const deleteDalRecord = (section, id)       => api.delete(`/dal/${section}/${id}`).then(r => r.data)
export const seedDalSection  = (section, records, force) =>
  api.post(`/dal/${section}/batch${force ? '?force=1' : ''}`, records).then(r => r.data)

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export const getNotifications = () =>
  api.get('/notifications').then((r) => r.data)

export const markNotificationRead = (id) =>
  api.put(`/notifications/${id}/read`).then((r) => r.data)

export const markAllNotificationsRead = () =>
  api.put('/notifications/read-all').then((r) => r.data)
