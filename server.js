import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import db from './db.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const app = express()
const PORT = 3005
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) { console.error('FATAL: JWT_SECRET no definido'); process.exit(1) }
const JWT_EXPIRES = '8h'

const uploadsDir = join(__dirname, 'uploads')
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })

// ─── EMAIL ────────────────────────────────────────────────────────────────────
// Configure via environment variables:
//   EMAIL_HOST (default: smtp.gmail.com)
//   EMAIL_PORT (default: 587)
//   EMAIL_USER — sender address
//   EMAIL_PASS — app password

const EMAIL_HOST = process.env.EMAIL_HOST || ''
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587')
const EMAIL_USER = process.env.EMAIL_USER || ''
const EMAIL_PASS = process.env.EMAIL_PASS || ''
const EMAIL_FROM = process.env.EMAIL_FROM || EMAIL_USER

const transporter = (EMAIL_HOST && EMAIL_USER && EMAIL_PASS)
  ? nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
      tls: { rejectUnauthorized: false },
    })
  : null

if (transporter) {
  transporter.verify((err) => {
    if (err) console.error('[email] Error de conexión SMTP:', err.message)
    else console.log(`✅ SMTP conectado — correos activos (${EMAIL_HOST}:${EMAIL_PORT})`)
  })
}

function sendAssignmentEmail(toEmail, toName, assigner, taskTitle) {
  if (!transporter || !toEmail) return
  const subject = `[DEAJ] Se te asignó una tarea: ${taskTitle}`
  const text = `Hola ${toName},\n\n${assigner} te asignó la tarea "${taskTitle}".\n\nRevisa el sistema de seguimiento para ver los detalles.\n\n— Sistema de Seguimiento de Tareas · INE · DEAJ`
  transporter.sendMail({ from: `"INE·DEAJ Tareas" <${EMAIL_FROM}>`, to: toEmail, subject, text })
    .catch((err) => console.error('[email] Error al enviar:', err.message))
}

app.use(helmet({ contentSecurityPolicy: false }))
const allowedOrigins = (process.env.ALLOWED_ORIGIN || 'http://localhost:3000,http://localhost:5175,http://10.184.150.162:5175')
  .split(',').map(o => o.trim())
app.use(cors({
  origin: (origin, cb) => cb(null, !origin || allowedOrigins.includes(origin)),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
}))
app.use(express.json())
app.use('/uploads', express.static(uploadsDir))

// Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9)
    cb(null, `task-${req.params.id}-${uniqueSuffix}${extname(file.originalname)}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } })

// ─── AUTH ─────────────────────────────────────────────────────────────────────

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Acceso restringido a administradores' })
  next()
}

const ssoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Espera 15 minutos.' },
})

// SSO endpoint — portal is the single source of truth; always sync user data
const PORTAL_SSO_SECRET = process.env.PORTAL_SSO_SECRET
if (!PORTAL_SSO_SECRET) { console.error('FATAL: PORTAL_SSO_SECRET no definido'); process.exit(1) }
app.post('/api/auth/sso', ssoLimiter, (req, res) => {
  const { sso_token } = req.body
  if (!sso_token) return res.status(400).json({ error: 'Token SSO requerido' })
  try {
    const payload = jwt.verify(sso_token, PORTAL_SSO_SECRET)
    const existing = db.prepare('SELECT * FROM users WHERE email = ?').get(payload.email)
    if (!existing) {
      db.prepare('INSERT INTO users (email, name, password_hash, role, direccion, puesto) VALUES (?,?,?,?,?,?)')
        .run(payload.email, payload.name, 'sso_user', payload.role || 'director', payload.direccion || '', payload.puesto || '')
    } else {
      db.prepare('UPDATE users SET name=?, role=?, direccion=?, puesto=? WHERE email=?')
        .run(payload.name, payload.role || existing.role, payload.direccion ?? '', payload.puesto ?? existing.puesto ?? '', payload.email)
    }
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(payload.email)
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, direccion: user.direccion },
      JWT_SECRET, { expiresIn: JWT_EXPIRES }
    )
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, direccion: user.direccion } })
  } catch {
    res.status(401).json({ error: 'Token SSO inválido o expirado' })
  }
})

// Auth middleware — all /api routes except SSO
app.use('/api', (req, res, next) => {
  if (req.path === '/auth/sso' && req.method === 'POST') return next()
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No autorizado' })
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ error: 'Sesión expirada. Inicia sesión nuevamente.' })
  }
})

// ─── USERS ────────────────────────────────────────────────────────────────────

// Returns assignable users based on the caller's role
app.get('/api/users', (req, res) => {
  const role = req.user.role
  let rows
  if (role === 'admin') {
    rows = db.prepare("SELECT id, name, role, direccion, email, puesto FROM users ORDER BY role, name").all()
  } else if (role === 'ejecutiva') {
    rows = db.prepare("SELECT id, name, role, direccion, puesto FROM users WHERE role = 'director' ORDER BY name").all()
  } else if (role === 'director') {
    rows = db.prepare("SELECT id, name, role, direccion, puesto FROM users WHERE role = 'subdirector' AND direccion = ? ORDER BY name").all(req.user.direccion)
  } else if (role === 'subdirector') {
    rows = db.prepare("SELECT id, name, role, direccion, puesto FROM users WHERE id = ?").all(req.user.id)
  } else {
    rows = []
  }
  res.json(rows)
})

// Admin-only: full user management
app.get('/api/admin/users', requireAdmin, (req, res) => {
  res.json(db.prepare('SELECT id, name, email, role, direccion, puesto FROM users ORDER BY role, name').all())
})

app.post('/api/admin/users', requireAdmin, (req, res) => {
  try {
    const { name, email, password, role, direccion, puesto } = req.body
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Nombre, correo, contraseña y rol son requeridos' })
    }
    const ROLES = ['admin','ejecutiva','director','subdirector']
    if (!ROLES.includes(role)) return res.status(400).json({ error: 'Rol inválido' })
    const lowerEmail = email.trim().toLowerCase()
    if (db.prepare('SELECT id FROM users WHERE email = ?').get(lowerEmail)) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo' })
    }
    const result = db.prepare('INSERT INTO users (username, email, password_hash, name, role, direccion, puesto) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(lowerEmail, lowerEmail, bcrypt.hashSync(password, 10), name.trim(), role, direccion || null, puesto?.trim() || null)
    res.status(201).json(db.prepare('SELECT id, name, email, role, direccion, puesto FROM users WHERE id = ?').get(result.lastInsertRowid))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear el usuario' })
  }
})

app.put('/api/admin/users/:id', requireAdmin, (req, res) => {
  try {
    const { name, email, password, role, direccion, puesto } = req.body
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id)
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' })
    const newEmail = email ? email.trim().toLowerCase() : user.email
    if (newEmail !== user.email && db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(newEmail, req.params.id)) {
      return res.status(409).json({ error: 'Ya existe un usuario con ese correo' })
    }
    const hash = password ? bcrypt.hashSync(password, 10) : user.password_hash
    db.prepare('UPDATE users SET name=?, email=?, username=?, password_hash=?, role=?, direccion=?, puesto=? WHERE id=?')
      .run(name ?? user.name, newEmail, newEmail, hash, role ?? user.role, direccion !== undefined ? (direccion || null) : user.direccion, puesto !== undefined ? (puesto?.trim() || null) : user.puesto, req.params.id)
    res.json(db.prepare('SELECT id, name, email, role, direccion, puesto FROM users WHERE id = ?').get(req.params.id))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar el usuario' })
  }
})

app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' })
    }
    if (!db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id)) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    db.prepare('UPDATE tasks SET assigned_to = NULL WHERE assigned_to = ?').run(req.params.id)
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id)
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar el usuario' })
  }
})

// ─── TASKS ────────────────────────────────────────────────────────────────────

app.get('/api/tasks/stats', (req, res) => {
  try {
    const roleFilter = req.user.role === 'subdirector'
      ? 'AND EXISTS (SELECT 1 FROM task_assignees WHERE task_id = t.id AND user_id = ?)'
      : req.user.role === 'director'
        ? 'AND (t.direccion = ? OR EXISTS (SELECT 1 FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id AND u.direccion = ?))'
        : ''
    const roleParams = req.user.role === 'subdirector'
      ? [req.user.id]
      : req.user.role === 'director'
        ? [req.user.direccion, req.user.direccion]
        : []

    const count = (extra, extraParams = []) =>
      db.prepare(`SELECT COUNT(*) as n FROM tasks t WHERE 1=1 ${roleFilter} ${extra}`)
        .get(...roleParams, ...extraParams).n

    const active = "AND t.status != 'completada'"
    res.json({
      // Por tiempo (solo tareas activas)
      vencida:    count(`${active} AND t.week_date < DATE('now','localtime')`),
      por_vencer: count(`${active} AND t.week_date >= DATE('now','localtime') AND t.week_date <= DATE('now','localtime','+2 days')`),
      a_tiempo:   count(`${active} AND t.week_date > DATE('now','localtime','+2 days')`),
      // Por estado
      pendiente:  count("AND t.status = 'pendiente'"),
      en_progreso:count("AND t.status = 'en_progreso'"),
      completada: count("AND t.status = 'completada'"),
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener estadísticas' })
  }
})

app.get('/api/tasks', (req, res) => {
  try {
    const { direccion, status, date_from, date_to, priority, page = 1, limit = 20, hideCompleted } = req.query
    let query = `
      SELECT t.*,
        u.name as assigned_to_name,
        u.username as assigned_to_username,
        (SELECT name FROM users WHERE id = t.created_by_id) as created_by_name,
        (SELECT GROUP_CONCAT(u2.name, ', ') FROM task_assignees ta2 JOIN users u2 ON ta2.user_id = u2.id WHERE ta2.task_id = t.id) as assigned_user_names,
        (SELECT GROUP_CONCAT(d, '|') FROM (SELECT DISTINCT u3.direccion as d FROM task_assignees ta3 JOIN users u3 ON ta3.user_id = u3.id WHERE ta3.task_id = t.id)) as assigned_area_keys,
        (SELECT COUNT(DISTINCT u3.direccion) FROM task_assignees ta3 JOIN users u3 ON ta3.user_id = u3.id WHERE ta3.task_id = t.id) as assignee_area_count,
        (SELECT GROUP_CONCAT(u4.direccion || ':' || COALESCE(u4.puesto, u4.name), '|') FROM task_assignees ta4 JOIN users u4 ON ta4.user_id = u4.id WHERE ta4.task_id = t.id) as assigned_area_puestos,
        (SELECT percentage FROM progress_updates WHERE task_id = t.id ORDER BY created_at DESC LIMIT 1) as latest_percentage,
        (SELECT COUNT(*) FROM progress_updates WHERE task_id = t.id) as progress_count,
        (SELECT COUNT(*) FROM comments WHERE task_id = t.id) as comment_count,
        (SELECT COUNT(*) FROM attachments WHERE task_id = t.id) as attachment_count,
        (
          SELECT COUNT(*) FROM task_assignees ta_dc JOIN users u_dc ON ta_dc.user_id = u_dc.id
          WHERE ta_dc.task_id = t.id
          AND (
            u_dc.role = 'subdirector'
            OR (u_dc.role = 'director' AND NOT EXISTS (
              SELECT 1 FROM task_assignees ta2 JOIN users u2 ON ta2.user_id = u2.id
              WHERE ta2.task_id = t.id AND u2.role = 'subdirector' AND u2.direccion = u_dc.direccion
            ))
          )
        ) as direct_closers_total,
        (
          SELECT COUNT(*) FROM task_area_closures tac
          JOIN users u_dc ON tac.user_id = u_dc.id
          JOIN task_assignees ta_dc ON ta_dc.user_id = tac.user_id AND ta_dc.task_id = tac.task_id
          WHERE tac.task_id = t.id
          AND (
            u_dc.role = 'subdirector'
            OR (u_dc.role = 'director' AND NOT EXISTS (
              SELECT 1 FROM task_assignees ta2 JOIN users u2 ON ta2.user_id = u2.id
              WHERE ta2.task_id = t.id AND u2.role = 'subdirector' AND u2.direccion = u_dc.direccion
            ))
          )
        ) as direct_closers_done,
        (
          SELECT COUNT(DISTINCT u_s.direccion) FROM task_assignees ta_s JOIN users u_s ON ta_s.user_id = u_s.id
          WHERE ta_s.task_id = t.id AND u_s.role = 'subdirector'
        ) as areas_needing_approval,
        (SELECT COUNT(*) FROM task_director_approvals WHERE task_id = t.id) as approvals_done
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE 1=1
    `
    const params = []
    if (req.user.role === 'subdirector') {
      query += ' AND EXISTS (SELECT 1 FROM task_assignees WHERE task_id = t.id AND user_id = ?)'
      params.push(req.user.id)
    } else if (req.user.role === 'director') {
      query += ' AND (t.direccion = ? OR EXISTS (SELECT 1 FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = t.id AND u.direccion = ?))'
      params.push(req.user.direccion, req.user.direccion)
    } else {
      if (direccion) { query += ' AND t.direccion = ?'; params.push(direccion) }
    }
    if (status === 'vencida') {
      query += " AND t.week_date < DATE('now', 'localtime') AND t.status != 'completada' AND (t.closed_at IS NULL OR t.closed_at = '')"
    } else if (status) {
      query += ' AND t.status = ?'
      params.push(status)
    }
    if (date_from) { query += ' AND t.week_date >= ?';  params.push(date_from) }
    if (date_to)   { query += ' AND t.week_date <= ?';  params.push(date_to) }
    if (priority)  { query += ' AND t.priority = ?';   params.push(priority) }
    // Hide completadas by default unless explicitly requested
    if (!status && hideCompleted !== 'false') {
      query += " AND t.status != 'completada'"
    }
    query += " ORDER BY CASE t.priority WHEN 'alta' THEN 1 WHEN 'media' THEN 2 WHEN 'baja' THEN 3 END, t.created_at DESC"

    const pageNum  = Math.max(1, parseInt(page) || 1)
    const limitNum = Math.min(1000, Math.max(1, parseInt(limit) || 20))
    const offset   = (pageNum - 1) * limitNum

    const countQuery = query.replace(/SELECT t\.\*[\s\S]*?FROM tasks t/, 'SELECT COUNT(*) as total FROM tasks t')
    const { total } = db.prepare(countQuery).get(...params)

    query += ' LIMIT ? OFFSET ?'
    const tasks = db.prepare(query).all(...params, limitNum, offset)

    res.json({ tasks, total, page: pageNum, pages: Math.ceil(total / limitNum) })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener las tareas' })
  }
})

app.post('/api/tasks', (req, res) => {
  try {
    const { title, description, direccion, week_date, priority, assigned_to } = req.body
    if (!title || !direccion || !week_date) {
      return res.status(400).json({ error: 'Título, dirección y semana son requeridos' })
    }
    const todayStr = new Date().toLocaleDateString('sv', { timeZone: 'America/Mexico_City' })
    if (week_date < todayStr) {
      return res.status(400).json({ error: 'La fecha de vencimiento no puede ser anterior a hoy.' })
    }
    const p = ['alta','media','baja'].includes(priority) ? priority : 'media'
    const assigneeIds = Array.isArray(assigned_to)
      ? assigned_to.map(Number).filter(Boolean)
      : (assigned_to ? [parseInt(assigned_to)] : [])
    const assignees = assigneeIds
      .map(id => db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(id))
      .filter(Boolean)
    const firstAssignee = assignees[0] || null

    const result = db.prepare(
      'INSERT INTO tasks (title, description, direccion, status, week_date, priority, assigned_to, created_by_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(title, description || '', direccion, 'pendiente', week_date, p, firstAssignee?.id || null, req.user.id)

    const taskId = result.lastInsertRowid
    const insertAssignee = db.prepare('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)')
    for (const a of assignees) {
      insertAssignee.run(taskId, a.id)
      db.prepare('INSERT INTO task_assignments (task_id, assigned_by_id, assigned_by_name, assigned_to_id, assigned_to_name) VALUES (?, ?, ?, ?, ?)')
        .run(taskId, req.user.id, req.user.name, a.id, a.name)
      if (a.id !== req.user.id) {
        const msg = `${req.user.name} te asignó la tarea: "${title}"`
        db.prepare('INSERT INTO notifications (user_id, task_id, message) VALUES (?, ?, ?)').run(a.id, taskId, msg)
        sendAssignmentEmail(a.email, a.name, req.user.name, title)
      }
    }

    res.status(201).json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al crear la tarea' })
  }
})

app.get('/api/tasks/:id', (req, res) => {
  try {
    const task = db.prepare(`
      SELECT t.*, u.name as assigned_to_name, u.username as assigned_to_username,
        (SELECT name FROM users WHERE id = t.created_by_id) as created_by_name,
        (SELECT GROUP_CONCAT(u2.name, ', ') FROM task_assignees ta2 JOIN users u2 ON ta2.user_id = u2.id WHERE ta2.task_id = t.id) as assigned_user_names
      FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.id = ?
    `).get(req.params.id)
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' })
    if (req.user.role === 'subdirector' || req.user.role === 'director') {
      const inOwnArea = task.direccion === req.user.direccion
      if (!inOwnArea) {
        const isAssigned = db.prepare('SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?').get(req.params.id, req.user.id)
        if (!isAssigned) return res.status(403).json({ error: 'No tienes acceso a esta tarea' })
      }
    }
    const progress     = db.prepare('SELECT * FROM progress_updates WHERE task_id = ? ORDER BY created_at DESC').all(req.params.id)
    const comments     = db.prepare('SELECT * FROM comments WHERE task_id = ? ORDER BY created_at DESC').all(req.params.id)
    const attachments  = db.prepare('SELECT * FROM attachments WHERE task_id = ? ORDER BY created_at DESC').all(req.params.id)
    const assignees    = db.prepare('SELECT u.id, u.name, u.direccion, u.role, u.puesto FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ?').all(req.params.id)
    const areaClosure       = db.prepare('SELECT * FROM task_area_closures WHERE task_id = ? ORDER BY created_at ASC').all(req.params.id)
    const directorApprovals = db.prepare('SELECT * FROM task_director_approvals WHERE task_id = ? ORDER BY created_at ASC').all(req.params.id)
    res.json({ ...task, progress_updates: progress, comments, attachments, assignees, area_closures: areaClosure, director_approvals: directorApprovals })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener la tarea' })
  }
})

app.get('/api/tasks/:id/assignments', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' })
    if (req.user.role === 'subdirector' || req.user.role === 'director') {
      const inOwnArea = task.direccion === req.user.direccion
      if (!inOwnArea) {
        const isAssigned = db.prepare('SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?').get(req.params.id, req.user.id)
        if (!isAssigned) return res.status(403).json({ error: 'No tienes acceso a esta tarea' })
      }
    }
    const assignments = db.prepare('SELECT * FROM task_assignments WHERE task_id = ? ORDER BY created_at ASC').all(req.params.id)
    res.json(assignments)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener el historial de asignaciones' })
  }
})

app.put('/api/tasks/:id', (req, res) => {
  try {
    const { title, description, status, week_date, priority, assigned_to, direccion } = req.body
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' })
    if (task.closed_at) return res.status(400).json({ error: 'No se puede editar una tarea cerrada' })
    const p = ['alta','media','baja'].includes(priority) ? priority : (task.priority || 'media')

    let newAssigneeId = task.assigned_to
    if (assigned_to !== undefined) {
      const assigneeIds = Array.isArray(assigned_to)
        ? assigned_to.map(Number).filter(Boolean)
        : (assigned_to ? [parseInt(assigned_to)] : [])
      const oldAssigneeIds = db.prepare('SELECT user_id FROM task_assignees WHERE task_id = ?').all(task.id).map(r => r.user_id)

      db.prepare('DELETE FROM task_assignees WHERE task_id = ?').run(task.id)
      const insertAssignee = db.prepare('INSERT OR IGNORE INTO task_assignees (task_id, user_id) VALUES (?, ?)')
      const taskTitle = title ?? task.title
      for (const id of assigneeIds) {
        const a = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(id)
        if (!a) continue
        insertAssignee.run(task.id, a.id)
        if (!oldAssigneeIds.includes(a.id)) {
          db.prepare('INSERT INTO task_assignments (task_id, assigned_by_id, assigned_by_name, assigned_to_id, assigned_to_name) VALUES (?, ?, ?, ?, ?)')
            .run(task.id, req.user.id, req.user.name, a.id, a.name)
          if (a.id !== req.user.id) {
            const msg = `${req.user.name} te asignó la tarea: "${taskTitle}"`
            db.prepare('INSERT INTO notifications (user_id, task_id, message) VALUES (?, ?, ?)').run(a.id, task.id, msg)
            sendAssignmentEmail(a.email, a.name, req.user.name, taskTitle)
          }
        }
      }
      newAssigneeId = assigneeIds[0] || null
    }

    db.prepare(`UPDATE tasks SET title=?, description=?, status=?, week_date=?, priority=?, assigned_to=?, direccion=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(title ?? task.title, description ?? task.description, status ?? task.status, week_date ?? task.week_date, p, newAssigneeId, direccion ?? task.direccion, req.params.id)

    res.json(db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al actualizar la tarea' })
  }
})

app.delete('/api/tasks/:id', (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' })
    if (task.status === 'completada' || task.closed_at) {
      return res.status(403).json({ error: 'No se puede eliminar una tarea cerrada o completada' })
    }
    const { role, id: userId } = req.user
    const isOwner = task.created_by_id === userId
    if (role !== 'admin' && role !== 'ejecutiva' && !isOwner) {
      return res.status(403).json({ error: 'Solo el creador de la tarea puede eliminarla' })
    }
    const atts = db.prepare('SELECT * FROM attachments WHERE task_id = ?').all(req.params.id)
    for (const att of atts) {
      const fp = join(uploadsDir, att.filename)
      if (existsSync(fp)) { try { unlinkSync(fp) } catch (_) {} }
    }
    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id)
    res.json({ message: 'Tarea eliminada correctamente' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar la tarea' })
  }
})

// ─── HELPERS ──────────────────────────────────────────────────────────────────

// Area-weighted progress: each area contributes 100/N %, within the area each direct-closer splits equally.
// "Direct closer" = subdirector, OR director whose area has NO subdirectors assigned.
function calcAreaProgress(taskId) {
  const areaRows = db.prepare(`
    SELECT u.direccion,
      SUM(CASE WHEN u.role = 'subdirector' THEN 1 ELSE 0 END) as subdirCount
    FROM task_assignees ta JOIN users u ON ta.user_id = u.id
    WHERE ta.task_id = ? GROUP BY u.direccion
  `).all(taskId)

  const numAreas = areaRows.length || 1
  let totalWeight = 0
  let allDone = true

  for (const area of areaRows) {
    const areaWeight = 1 / numAreas
    if (area.subdirCount === 0) {
      // Director-only area
      const dirClosed = db.prepare(`
        SELECT COUNT(*) as cnt FROM task_area_closures tac JOIN users u ON tac.user_id = u.id
        WHERE tac.task_id = ? AND u.direccion = ? AND u.role = 'director'
      `).get(taskId, area.direccion).cnt > 0 ? 1 : 0
      totalWeight += dirClosed * areaWeight
      if (!dirClosed) allDone = false
    } else {
      // Subdirector area
      const closedSubdirs = db.prepare(`
        SELECT COUNT(*) as cnt FROM task_area_closures tac JOIN users u ON tac.user_id = u.id
        WHERE tac.task_id = ? AND u.direccion = ? AND u.role = 'subdirector'
      `).get(taskId, area.direccion).cnt
      totalWeight += (closedSubdirs / area.subdirCount) * areaWeight
      if (closedSubdirs < area.subdirCount) allDone = false
    }
  }

  return { pct: Math.round(totalWeight * 100), allDone }
}

// ─── PROGRESS ─────────────────────────────────────────────────────────────────

app.post('/api/tasks/:id/close', upload.single('file'), (req, res) => {
  try {
    const task = db.prepare(`
      SELECT t.*, u.role as created_by_role
      FROM tasks t LEFT JOIN users u ON t.created_by_id = u.id
      WHERE t.id = ?
    `).get(req.params.id)
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' })
    if (task.closed_at) return res.status(400).json({ error: 'La tarea ya fue cerrada' })
    const { closure_notes, closed_at } = req.body
    if (!closure_notes?.trim()) return res.status(400).json({ error: 'La síntesis de cierre es requerida' })
    const closedDate = closed_at || localToday()
    const filename = req.file ? req.file.filename : null
    const originalName = req.file ? req.file.originalname : null

    // "Direct closers" = subdirectors + directors whose area has NO subdirectors in this task
    const totalAssignees = db.prepare(`
      SELECT COUNT(*) as cnt FROM task_assignees ta JOIN users u ON ta.user_id = u.id
      WHERE ta.task_id = ? AND (
        u.role = 'subdirector'
        OR (u.role = 'director' AND NOT EXISTS (
          SELECT 1 FROM task_assignees ta2 JOIN users u2 ON ta2.user_id = u2.id
          WHERE ta2.task_id = ta.task_id AND u2.role = 'subdirector' AND u2.direccion = u.direccion
        ))
      )
    `).get(req.params.id).cnt
    const isMultiAssignee = totalAssignees > 1

    const myAreaSubdirCount = req.user.role === 'director'
      ? db.prepare(`SELECT COUNT(*) as cnt FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ? AND u.role = 'subdirector' AND u.direccion = ?`).get(req.params.id, req.user.direccion || '').cnt
      : 0

    const isPrivileged = req.user.role === 'ejecutiva' || req.user.role === 'admin'
    const isCreator = task.created_by_id === req.user.id
    const canFullClose = isPrivileged || isCreator
    const createdByEjecutiva = task.created_by_role === 'ejecutiva' || task.created_by_role === 'admin'

    // Director with subdirectors must use the visto-bueno endpoint, not direct close
    if (req.user.role === 'director' && myAreaSubdirCount > 0 && !canFullClose) {
      return res.status(400).json({ error: 'Usa el visto bueno para validar los cierres de tus subdirectores' })
    }

    // Multi-assignee task not created by current user → each assignee informs individually
    if (isMultiAssignee && !canFullClose) {
      const userArea = req.user.direccion || String(req.user.id)

      const existing = db.prepare('SELECT 1 FROM task_area_closures WHERE task_id = ? AND user_id = ?').get(req.params.id, req.user.id)
      if (existing) return res.status(400).json({ error: 'Ya informaste el cierre de esta tarea' })

      db.prepare(`INSERT INTO task_area_closures (task_id, area_key, user_id, user_name, closure_notes, closure_date, closure_filename, closure_original_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(req.params.id, userArea, req.user.id, req.user.name, closure_notes.trim(), closedDate, filename, originalName)

      const { pct: partialPct, allDone: allDirectClosersDone } = calcAreaProgress(req.params.id)
      db.prepare('INSERT INTO progress_updates (task_id, content, percentage, author_name) VALUES (?, ?, ?, ?)')
        .run(req.params.id, `[Informe de cierre] ${closure_notes.trim()}`, partialPct, req.user.name)

      // Auto-close when all direct closers done AND all needed visto buenos given (not for ejecutiva tasks)
      if (!createdByEjecutiva && allDirectClosersDone) {
        const areasWithSubdirs = db.prepare(`
          SELECT COUNT(DISTINCT u.direccion) as cnt FROM task_assignees ta JOIN users u ON ta.user_id = u.id
          WHERE ta.task_id = ? AND u.role = 'subdirector'
        `).get(req.params.id).cnt
        const approvalsDone = db.prepare('SELECT COUNT(*) as cnt FROM task_director_approvals WHERE task_id = ?').get(req.params.id).cnt
        if (approvalsDone >= areasWithSubdirs) {
          db.prepare(`UPDATE tasks SET status='completada', closed_at=?, closure_notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
            .run(closedDate, closure_notes.trim(), req.params.id)
        } else {
          db.prepare(`UPDATE tasks SET status='en_progreso', updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(req.params.id)
        }
      } else {
        db.prepare(`UPDATE tasks SET status='en_progreso', updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(req.params.id)
      }
      return res.json(db.prepare(`SELECT t.*, u.name as assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?`).get(req.params.id))
    }

    // Full closure: creator, ejecutiva, or admin
    db.prepare(`UPDATE tasks SET status='completada', closed_at=?, closure_notes=?, closure_filename=?, closure_original_name=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`)
      .run(closedDate, closure_notes.trim(), filename, originalName, req.params.id)
    db.prepare('INSERT INTO progress_updates (task_id, content, percentage, author_name) VALUES (?, ?, ?, ?)')
      .run(req.params.id, `[Cierre] ${closure_notes.trim()}`, 100, req.user.name)
    res.json(db.prepare(`SELECT t.*, u.name as assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?`).get(req.params.id))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al cerrar la tarea', detail: err.message })
  }
})

app.post('/api/tasks/:id/approve', (req, res) => {
  try {
    const task = db.prepare(`SELECT t.*, u.role as created_by_role FROM tasks t LEFT JOIN users u ON t.created_by_id = u.id WHERE t.id = ?`).get(req.params.id)
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' })
    if (task.closed_at) return res.status(400).json({ error: 'La tarea ya está cerrada' })
    if (req.user.role !== 'director') return res.status(403).json({ error: 'Solo los directores pueden dar visto bueno' })

    const userArea = req.user.direccion
    if (!userArea) return res.status(400).json({ error: 'Tu cuenta no tiene área asignada' })

    const existing = db.prepare('SELECT 1 FROM task_director_approvals WHERE task_id = ? AND area_key = ?').get(req.params.id, userArea)
    if (existing) return res.status(400).json({ error: 'Ya registraste tu visto bueno para esta tarea' })

    // All SUBDIRECTORS from this area must have closed first (directors are excluded — they give visto bueno)
    const areaSubdirIds = db.prepare(
      `SELECT ta.user_id FROM task_assignees ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ? AND u.direccion = ? AND u.role = 'subdirector'`
    ).all(req.params.id, userArea).map(r => r.user_id)

    console.log(`[approve] task=${req.params.id} userArea=${userArea} areaSubdirIds=${JSON.stringify(areaSubdirIds)}`)

    if (areaSubdirIds.length > 0) {
      const closedUserIds = db.prepare('SELECT user_id FROM task_area_closures WHERE task_id = ?').all(req.params.id).map(r => r.user_id)
      console.log(`[approve] closedUserIds=${JSON.stringify(closedUserIds)}`)
      const allClosed = areaSubdirIds.every(id => closedUserIds.includes(id))
      console.log(`[approve] allClosed=${allClosed}`)
      if (!allClosed) return res.status(400).json({ error: 'Todos los asignados de tu área deben informar su cierre primero' })
    }

    const { notes } = req.body
    const approvedAt = localToday()

    db.prepare('INSERT INTO task_director_approvals (task_id, director_id, director_name, area_key, notes, approved_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(req.params.id, req.user.id, req.user.name, userArea, notes?.trim() || null, approvedAt)

    // Progress keeps the area-weighted percentage (same calculation used in close endpoint)
    const { pct: currentPct, allDone: allDirectClosersDone } = calcAreaProgress(req.params.id)
    const totalAreasNeedingApproval = db.prepare(`
      SELECT COUNT(DISTINCT u.direccion) as cnt FROM task_assignees ta JOIN users u ON ta.user_id = u.id
      WHERE ta.task_id = ? AND u.role = 'subdirector'
    `).get(req.params.id).cnt || 1
    const approvedCount = db.prepare('SELECT COUNT(*) as cnt FROM task_director_approvals WHERE task_id = ?').get(req.params.id).cnt

    db.prepare('INSERT INTO progress_updates (task_id, content, percentage, author_name) VALUES (?, ?, ?, ?)')
      .run(req.params.id, `[Visto bueno] ${req.user.name}: ${notes?.trim() || 'Sin notas'}`, currentPct, req.user.name)

    // Auto-close when all approvals done AND all direct closers have closed (not for ejecutiva tasks)
    const createdByEjecutiva = task.created_by_role === 'ejecutiva' || task.created_by_role === 'admin'
    if (!createdByEjecutiva && approvedCount >= totalAreasNeedingApproval) {
      const { allDone: allDirectClosersDone2 } = calcAreaProgress(req.params.id)
      if (allDirectClosersDone2) {
        const lastDate = db.prepare('SELECT MAX(closure_date) as d FROM task_area_closures WHERE task_id = ?').get(req.params.id)?.d || localToday()
        db.prepare(`UPDATE tasks SET status='completada', closed_at=?, updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(lastDate, req.params.id)
        return res.json(db.prepare('SELECT t.*, u.name as assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?').get(req.params.id))
      }
    }
    db.prepare(`UPDATE tasks SET status='en_progreso', updated_at=CURRENT_TIMESTAMP WHERE id=? AND status != 'completada'`).run(req.params.id)
    res.json(db.prepare('SELECT t.*, u.name as assigned_to_name FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id WHERE t.id = ?').get(req.params.id))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al registrar el visto bueno', detail: err.message })
  }
})

app.post('/api/tasks/:id/progress', (req, res) => {
  try {
    const { content, percentage } = req.body
    if (!content) return res.status(400).json({ error: 'El contenido es requerido' })
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' })
    if (task.closed_at) return res.status(400).json({ error: 'No se puede modificar el avance de una tarea cerrada' })
    const pct = Math.min(100, Math.max(0, parseInt(percentage) || 0))
    const result = db.prepare('INSERT INTO progress_updates (task_id, content, percentage, author_name) VALUES (?, ?, ?, ?)').run(req.params.id, content, pct, req.user.name)
    let newStatus = task.status
    if (pct === 100) newStatus = 'completada'
    else if (pct > 0 && task.status === 'pendiente') newStatus = 'en_progreso'
    if (newStatus !== task.status) {
      db.prepare('UPDATE tasks SET status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(newStatus, req.params.id)
    }
    res.status(201).json(db.prepare('SELECT * FROM progress_updates WHERE id = ?').get(result.lastInsertRowid))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al agregar el avance' })
  }
})

// ─── COMMENTS ─────────────────────────────────────────────────────────────────

app.post('/api/tasks/:id/comments', (req, res) => {
  try {
    const { content } = req.body
    if (!content) return res.status(400).json({ error: 'El comentario es requerido' })
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' })
    if (req.user.role === 'subdirector' || req.user.role === 'director') {
      const inOwnArea = req.user.role === 'director' && task.direccion === req.user.direccion
      if (!inOwnArea) {
        const isAssigned = db.prepare('SELECT 1 FROM task_assignees WHERE task_id = ? AND user_id = ?').get(req.params.id, req.user.id)
        if (!isAssigned) return res.status(403).json({ error: 'No tienes acceso a esta tarea' })
      }
    }
    const result = db.prepare('INSERT INTO comments (task_id, content, author) VALUES (?, ?, ?)').run(req.params.id, content, req.user.name)
    res.status(201).json(db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al agregar el comentario' })
  }
})

// ─── ATTACHMENTS ──────────────────────────────────────────────────────────────

app.post('/api/tasks/:id/files', upload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' })
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id)
    if (!task) return res.status(404).json({ error: 'Tarea no encontrada' })
    const result = db.prepare('INSERT INTO attachments (task_id, filename, original_name, size) VALUES (?, ?, ?, ?)').run(req.params.id, req.file.filename, req.file.originalname, req.file.size)
    res.status(201).json(db.prepare('SELECT * FROM attachments WHERE id = ?').get(result.lastInsertRowid))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al subir el archivo' })
  }
})

app.delete('/api/tasks/:id/files/:attachmentId', (req, res) => {
  try {
    const att = db.prepare('SELECT * FROM attachments WHERE id = ? AND task_id = ?').get(req.params.attachmentId, req.params.id)
    if (!att) return res.status(404).json({ error: 'Archivo no encontrado' })
    const fp = join(uploadsDir, att.filename)
    if (existsSync(fp)) { try { unlinkSync(fp) } catch (_) {} }
    db.prepare('DELETE FROM attachments WHERE id = ?').run(req.params.attachmentId)
    res.json({ message: 'Archivo eliminado correctamente' })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al eliminar el archivo' })
  }
})

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

app.get('/api/notifications', (req, res) => {
  const rows = db.prepare(`
    SELECT n.*, t.title as task_title, t.direccion
    FROM notifications n
    LEFT JOIN tasks t ON n.task_id = t.id
    WHERE n.user_id = ?
    ORDER BY n.created_at DESC
    LIMIT 30
  `).all(req.user.id)
  res.json(rows)
})

app.put('/api/notifications/:id/read', (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id)
  res.json({ ok: true })
})

app.put('/api/notifications/read-all', (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id)
  res.json({ ok: true })
})

// ─── REPORT ───────────────────────────────────────────────────────────────────

app.get('/api/report', (req, res) => {
  try {
    const { week } = req.query
    const conditions = []
    const params = []
    if (week) { conditions.push('week_date = ?'); params.push(week) }
    if (req.user.role === 'subdirector' || req.user.role === 'director') { conditions.push('direccion = ?'); params.push(req.user.direccion) }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''
    const stats = db.prepare(`
      SELECT direccion,
        COUNT(*) as total,
        SUM(CASE WHEN status='pendiente'  THEN 1 ELSE 0 END) as pendiente,
        SUM(CASE WHEN status='en_progreso' THEN 1 ELSE 0 END) as en_progreso,
        SUM(CASE WHEN status='completada' THEN 1 ELSE 0 END) as completada,
        SUM(CASE WHEN status!='completada' AND (closed_at IS NULL OR closed_at='') AND week_date < DATE('now', 'localtime') THEN 1 ELSE 0 END) as vencida
      FROM tasks ${where} GROUP BY direccion ORDER BY direccion
    `).all(...params)
    res.json(stats)
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Error al obtener el reporte' })
  }
})

// ─── INHÁBILES ────────────────────────────────────────────────────────────────

function requireInhabilAccess(req, res, next) {
  const { role, direccion } = req.user
  if (role === 'admin' || direccion === 'enlace_interinstitucional') return next()
  return res.status(403).json({ error: 'Acceso restringido' })
}

app.get('/api/inhabil-days', (req, res) => {
  res.json(db.prepare('SELECT * FROM inhabil_days ORDER BY date DESC').all())
})

app.post('/api/inhabil-days', requireInhabilAccess, (req, res) => {
  try {
    const { date, reason } = req.body
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Fecha inválida' })
    }
    db.prepare('INSERT INTO inhabil_days (date, reason, created_by_id, created_by_name) VALUES (?, ?, ?, ?)')
      .run(date, reason?.trim() || null, req.user.id, req.user.name)
    res.status(201).json({ ok: true })
  } catch (err) {
    if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Ese día ya está marcado como inhábil' })
    console.error(err); res.status(500).json({ error: 'Error al guardar' })
  }
})

app.delete('/api/inhabil-days/:date', requireInhabilAccess, (req, res) => {
  db.prepare('DELETE FROM inhabil_days WHERE date = ?').run(req.params.date)
  res.json({ ok: true })
})

// ─── ENLACE / DIARIO ──────────────────────────────────────────────────────────

function requireEnlaceAccess(req, res, next) {
  const { role, direccion } = req.user
  if (role === 'admin' || role === 'ejecutiva' || direccion === 'enlace_interinstitucional') return next()
  return res.status(403).json({ error: 'Acceso restringido' })
}

app.get('/api/enlace/pending', requireEnlaceAccess, (req, res) => {
  try {
    const today = localToday()
    const tasks = db.prepare(`
      SELECT t.*, u.name as assigned_to_name
      FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.priority = 'alta' AND t.status != 'completada' AND t.week_date > ?
      ORDER BY t.week_date ASC, t.direccion
    `).all(today)
    res.json(tasks)
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error' }) }
})

app.get('/api/enlace/completed', requireEnlaceAccess, (req, res) => {
  try {
    const now = new Date()
    const day = now.getDay()
    const diff = now.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(now); monday.setDate(diff)
    const mondayStr = localDateStr(monday)
    const tasks = db.prepare(`
      SELECT t.*, u.name as assigned_to_name
      FROM tasks t LEFT JOIN users u ON t.assigned_to = u.id
      WHERE t.priority = 'alta' AND t.status = 'completada'
        AND COALESCE(t.closed_at, DATE(t.updated_at)) >= ?
      ORDER BY t.direccion, t.closed_at DESC, t.updated_at DESC
    `).all(mondayStr)
    res.json(tasks)
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error' }) }
})

app.get('/api/enlace/matrix', requireEnlaceAccess, (req, res) => {
  try {
    const { week_start } = req.query
    let monday
    if (week_start) {
      monday = new Date(week_start + 'T12:00:00')
    } else {
      const now = new Date()
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      monday = new Date(now); monday.setDate(diff)
    }
    const dates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i)
      return localDateStr(d)
    })
    const users = db.prepare(`
      SELECT id, name, role, direccion FROM users
      WHERE role IN ('director','subdirector') AND direccion != 'enlace_interinstitucional'
      ORDER BY direccion, role DESC, name
    `).all()
    const reports = db.prepare(
      `SELECT * FROM daily_reports WHERE report_date >= ? AND report_date <= ?`
    ).all(dates[0], dates[6])
    const pendingByUserDay = db.prepare(`
      SELECT ta.user_id as assigned_to, t.week_date
      FROM tasks t JOIN task_assignees ta ON ta.task_id = t.id
      WHERE t.priority = 'alta' AND t.status != 'completada'
        AND t.week_date >= ? AND t.week_date <= ?
    `).all(dates[0], dates[6])
    const completedByUserDay = db.prepare(`
      SELECT ta.user_id as assigned_to, COALESCE(t.closed_at, DATE(t.updated_at)) as task_date, COUNT(*) as cnt
      FROM tasks t JOIN task_assignees ta ON ta.task_id = t.id
      WHERE t.priority = 'alta' AND t.status = 'completada'
        AND COALESCE(t.closed_at, DATE(t.updated_at)) >= ? AND COALESCE(t.closed_at, DATE(t.updated_at)) <= ?
      GROUP BY ta.user_id, COALESCE(t.closed_at, DATE(t.updated_at))
    `).all(dates[0], dates[6])
    const inhabilDays = db.prepare('SELECT date FROM inhabil_days WHERE date >= ? AND date <= ?')
      .all(dates[0], dates[6]).map(r => r.date)
    res.json({ users, dates, reports, pendingByUserDay, completedByUserDay, inhabilDays })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error' }) }
})

app.post('/api/daily-reports', (req, res) => {
  try {
    const { report_date, status, report_type } = req.body
    const date  = report_date || localToday()
    const today = localToday()
    if (date > today) return res.status(400).json({ error: 'No se puede reportar para una fecha futura' })
    const s    = ['reporte', 'sin_reporte'].includes(status)              ? status      : 'sin_reporte'
    const type = ['solicitudes', 'conclusiones'].includes(report_type)    ? report_type : 'solicitudes'
    db.prepare(`
      INSERT INTO daily_reports (user_id, user_name, direccion, report_date, report_type, status)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, report_date, report_type) DO UPDATE SET status = excluded.status, created_at = CURRENT_TIMESTAMP
    `).run(req.user.id, req.user.name, req.user.direccion, date, type, s)
    res.json({ ok: true })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Error' }) }
})

app.get('/api/daily-reports/me', (req, res) => {
  const rows = db.prepare('SELECT * FROM daily_reports WHERE user_id = ? ORDER BY report_date DESC LIMIT 14').all(req.user.id)
  res.json(rows)
})

// ─── CONVENIOS ────────────────────────────────────────────────────────────────

const canAccessConvenios = (user) =>
  user.role === 'admin' || user.role === 'ejecutiva' || user.role === 'secretaria' || user.direccion === 'contratos_convenios'

app.get('/api/convenios', (req, res) => {
  if (!canAccessConvenios(req.user)) return res.status(403).json({ error: 'Sin acceso' })
  const rows = db.prepare('SELECT * FROM convenios ORDER BY created_at DESC').all()
  res.json(rows)
})

app.post('/api/convenios', (req, res) => {
  if (!canAccessConvenios(req.user)) return res.status(403).json({ error: 'Sin acceso' })
  const { tipo_convenio, tercero, oficio_solicitud, fecha_oficio, fecha_asignacion, id_sai, tema,
    oficio_primera_revision, fecha_primera_revision, atencion_obs_ur, fecha_atencion_obs_ur,
    oficio_segunda_revision, fecha_segunda_revision, segunda_atencion_obs_ur,
    oficio_validacion_juridica, fecha_validacion_juridica,
    oficio_validacion_preliminar, fecha_validacion_preliminar,
    numero_convenio, estatus, fecha_vencimiento, observaciones, responsable } = req.body
  if (!tercero?.trim()) return res.status(400).json({ error: 'El campo Tercero es requerido' })
  const result = db.prepare(`
    INSERT INTO convenios (tipo_convenio, tercero, oficio_solicitud, fecha_oficio, fecha_asignacion, id_sai, tema,
      oficio_primera_revision, fecha_primera_revision, atencion_obs_ur, fecha_atencion_obs_ur,
      oficio_segunda_revision, fecha_segunda_revision, segunda_atencion_obs_ur,
      oficio_validacion_juridica, fecha_validacion_juridica,
      oficio_validacion_preliminar, fecha_validacion_preliminar,
      numero_convenio, estatus, fecha_vencimiento, observaciones, responsable, created_by_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(tipo_convenio||null, tercero.trim(), oficio_solicitud||null, fecha_oficio||null, fecha_asignacion||null,
    id_sai||null, tema||null,
    oficio_primera_revision||null, fecha_primera_revision||null, atencion_obs_ur||null, fecha_atencion_obs_ur||null,
    oficio_segunda_revision||null, fecha_segunda_revision||null, segunda_atencion_obs_ur||null,
    oficio_validacion_juridica||null, fecha_validacion_juridica||null,
    oficio_validacion_preliminar||null, fecha_validacion_preliminar||null,
    numero_convenio||null, estatus||'revision', fecha_vencimiento||null, observaciones||null,
    responsable||null, req.user.id)
  res.status(201).json(db.prepare('SELECT * FROM convenios WHERE id = ?').get(result.lastInsertRowid))
})

app.put('/api/convenios/:id', (req, res) => {
  if (!canAccessConvenios(req.user)) return res.status(403).json({ error: 'Sin acceso' })
  const { tipo_convenio, tercero, oficio_solicitud, fecha_oficio, fecha_asignacion, id_sai, tema,
    oficio_primera_revision, fecha_primera_revision, atencion_obs_ur, fecha_atencion_obs_ur,
    oficio_segunda_revision, fecha_segunda_revision, segunda_atencion_obs_ur,
    oficio_validacion_juridica, fecha_validacion_juridica,
    oficio_validacion_preliminar, fecha_validacion_preliminar,
    numero_convenio, estatus, fecha_vencimiento, observaciones, responsable } = req.body
  if (!tercero?.trim()) return res.status(400).json({ error: 'El campo Tercero es requerido' })
  db.prepare(`
    UPDATE convenios SET tipo_convenio=?, tercero=?, oficio_solicitud=?, fecha_oficio=?, fecha_asignacion=?,
      id_sai=?, tema=?,
      oficio_primera_revision=?, fecha_primera_revision=?, atencion_obs_ur=?, fecha_atencion_obs_ur=?,
      oficio_segunda_revision=?, fecha_segunda_revision=?, segunda_atencion_obs_ur=?,
      oficio_validacion_juridica=?, fecha_validacion_juridica=?,
      oficio_validacion_preliminar=?, fecha_validacion_preliminar=?,
      numero_convenio=?, estatus=?, fecha_vencimiento=?, observaciones=?, responsable=?,
      updated_at=CURRENT_TIMESTAMP
    WHERE id=?
  `).run(tipo_convenio||null, tercero.trim(), oficio_solicitud||null, fecha_oficio||null, fecha_asignacion||null,
    id_sai||null, tema||null,
    oficio_primera_revision||null, fecha_primera_revision||null, atencion_obs_ur||null, fecha_atencion_obs_ur||null,
    oficio_segunda_revision||null, fecha_segunda_revision||null, segunda_atencion_obs_ur||null,
    oficio_validacion_juridica||null, fecha_validacion_juridica||null,
    oficio_validacion_preliminar||null, fecha_validacion_preliminar||null,
    numero_convenio||null, estatus||'revision', fecha_vencimiento||null, observaciones||null,
    responsable||null, req.params.id)
  res.json(db.prepare('SELECT * FROM convenios WHERE id = ?').get(req.params.id))
})

app.delete('/api/convenios/:id', (req, res) => {
  if (!canAccessConvenios(req.user)) return res.status(403).json({ error: 'Sin acceso' })
  db.prepare('DELETE FROM convenios WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

/* ── DAL — Asuntos Laborales ─────────────────────────────────────────────── */
const DAL_SECTIONS = new Set(['actores','emplaz','noemplaz','sentencias','requerims','cumplims','incidentes','amparos','conciliacion','oic','reencauz'])
const canAccessDal = (user) => user.role === 'admin' || user.role === 'ejecutiva' || user.direccion === 'asuntos_laborales'

app.get('/api/dal/:section', (req, res) => {
  if (!canAccessDal(req.user)) return res.status(403).json({ error: 'Sin acceso' })
  if (!DAL_SECTIONS.has(req.params.section)) return res.status(400).json({ error: 'Sección inválida' })
  const rows = db.prepare('SELECT id, data FROM dal_records WHERE section = ? ORDER BY id ASC').all(req.params.section)
  res.json(rows.map(r => ({ id: r.id, ...JSON.parse(r.data) })))
})

app.post('/api/dal/:section', (req, res) => {
  if (!canAccessDal(req.user)) return res.status(403).json({ error: 'Sin acceso' })
  if (!DAL_SECTIONS.has(req.params.section)) return res.status(400).json({ error: 'Sección inválida' })
  const { id: _id, ...data } = req.body
  const result = db.prepare('INSERT INTO dal_records (section, data) VALUES (?, ?)').run(req.params.section, JSON.stringify(data))
  const row = db.prepare('SELECT id, data FROM dal_records WHERE id = ?').get(result.lastInsertRowid)
  res.status(201).json({ id: row.id, ...JSON.parse(row.data) })
})

app.post('/api/dal/:section/batch', (req, res) => {
  if (!canAccessDal(req.user)) return res.status(403).json({ error: 'Sin acceso' })
  if (!DAL_SECTIONS.has(req.params.section)) return res.status(400).json({ error: 'Sección inválida' })
  const records = Array.isArray(req.body) ? req.body : []
  const force = req.query.force === '1'
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM dal_records WHERE section = ?').get(req.params.section)
  if (!force && existing.cnt > 0) return res.json({ skipped: true, count: existing.cnt })
  if (force) db.prepare('DELETE FROM dal_records WHERE section = ?').run(req.params.section)
  const insert = db.prepare('INSERT INTO dal_records (section, data) VALUES (?, ?)')
  db.transaction(() => {
    for (const r of records) {
      const { id: _id, ...data } = r
      insert.run(req.params.section, JSON.stringify(data))
    }
  })()
  const rows = db.prepare('SELECT id, data FROM dal_records WHERE section = ? ORDER BY id ASC').all(req.params.section)
  res.json(rows.map(r => ({ id: r.id, ...JSON.parse(r.data) })))
})

app.put('/api/dal/:section/:id', (req, res) => {
  if (!canAccessDal(req.user)) return res.status(403).json({ error: 'Sin acceso' })
  if (!DAL_SECTIONS.has(req.params.section)) return res.status(400).json({ error: 'Sección inválida' })
  const row = db.prepare('SELECT id FROM dal_records WHERE id = ? AND section = ?').get(req.params.id, req.params.section)
  if (!row) return res.status(404).json({ error: 'Registro no encontrado' })
  const { id: _id, ...data } = req.body
  db.prepare('UPDATE dal_records SET data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(JSON.stringify(data), req.params.id)
  const updated = db.prepare('SELECT id, data FROM dal_records WHERE id = ?').get(req.params.id)
  res.json({ id: updated.id, ...JSON.parse(updated.data) })
})

app.delete('/api/dal/:section/:id', (req, res) => {
  if (!canAccessDal(req.user)) return res.status(403).json({ error: 'Sin acceso' })
  if (!DAL_SECTIONS.has(req.params.section)) return res.status(400).json({ error: 'Sección inválida' })
  db.prepare('DELETE FROM dal_records WHERE id = ? AND section = ?').run(req.params.id, req.params.section)
  res.json({ ok: true })
})

app.use('/tareas2', express.static(join(__dirname, 'dist')))
app.use(express.static(join(__dirname, 'dist')))
app.get('*', (req, res) => res.sendFile(join(__dirname, 'dist', 'index.html')))

app.listen(PORT, () => console.log(`✅ Servidor INE corriendo en http://localhost:${PORT}`))
