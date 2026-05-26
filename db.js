import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const db = new Database(join(__dirname, '..', 'tareas', 'tareas.db'))

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    direccion TEXT NOT NULL,
    status TEXT DEFAULT 'pendiente',
    week_date TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS progress_updates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    percentage INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author TEXT DEFAULT 'Directora Ejecutiva',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    size INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'director',
    direccion TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// Migrations for existing DBs
try { db.exec("ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'media'") } catch (_) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL") } catch (_) {}
try { db.exec("ALTER TABLE users ADD COLUMN email TEXT") } catch (_) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN closed_at TEXT") } catch (_) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN closure_notes TEXT") } catch (_) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN closure_filename TEXT") } catch (_) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN closure_original_name TEXT") } catch (_) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL") } catch (_) {}
try { db.exec("ALTER TABLE users ADD COLUMN puesto TEXT") } catch (_) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS task_assignees (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, user_id)
  );
`)

// Migrate existing single assigned_to → task_assignees
try {
  db.exec(`
    INSERT OR IGNORE INTO task_assignees (task_id, user_id)
    SELECT id, assigned_to FROM tasks WHERE assigned_to IS NOT NULL
  `)
} catch (_) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS task_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    assigned_by_id INTEGER,
    assigned_by_name TEXT NOT NULL,
    assigned_to_id INTEGER,
    assigned_to_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS task_area_closures (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    area_key TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    user_name TEXT NOT NULL,
    closure_notes TEXT,
    closure_date TEXT,
    closure_filename TEXT,
    closure_original_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, area_key)
  );
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS task_director_approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    director_id INTEGER NOT NULL,
    director_name TEXT NOT NULL,
    area_key TEXT NOT NULL,
    notes TEXT,
    approved_at TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(task_id, area_key)
  );
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS daily_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    direccion TEXT NOT NULL,
    report_date TEXT NOT NULL,
    report_type TEXT NOT NULL DEFAULT 'solicitudes',
    status TEXT NOT NULL DEFAULT 'sin_reporte',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, report_date, report_type)
  );
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS inhabil_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    reason TEXT,
    created_by_id INTEGER,
    created_by_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// Migrate task_area_closures: change UNIQUE from (task_id, area_key) → (task_id, user_id)
try {
  const row = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='task_area_closures'").get()
  if (row && row.sql && row.sql.includes('UNIQUE(task_id, area_key)')) {
    db.exec(`
      CREATE TABLE task_area_closures_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        area_key TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        closure_notes TEXT,
        closure_date TEXT,
        closure_filename TEXT,
        closure_original_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, user_id)
      );
      INSERT OR IGNORE INTO task_area_closures_new SELECT * FROM task_area_closures;
      DROP TABLE task_area_closures;
      ALTER TABLE task_area_closures_new RENAME TO task_area_closures;
    `)
    console.log('✅ Migración task_area_closures: UNIQUE cambiado a (task_id, user_id)')
  }
} catch (e) { console.error('Migration task_area_closures:', e.message) }

// Migrate daily_reports: add report_type column and rebuild unique index if needed
try {
  const cols = db.prepare("PRAGMA table_info(daily_reports)").all().map(c => c.name)
  if (!cols.includes('report_type')) {
    db.exec(`
      CREATE TABLE daily_reports_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_name TEXT NOT NULL,
        direccion TEXT NOT NULL,
        report_date TEXT NOT NULL,
        report_type TEXT NOT NULL DEFAULT 'solicitudes',
        status TEXT NOT NULL DEFAULT 'sin_reporte',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, report_date, report_type)
      )
    `)
    db.exec(`INSERT INTO daily_reports_new (user_id,user_name,direccion,report_date,report_type,status,created_at)
      SELECT user_id,user_name,direccion,report_date,'solicitudes',status,created_at FROM daily_reports`)
    db.exec(`DROP TABLE daily_reports`)
    db.exec(`ALTER TABLE daily_reports_new RENAME TO daily_reports`)
  }
} catch (e) { console.error('Migration daily_reports:', e.message) }

// Re-seed users if no admin role exists (triggers on first run or schema upgrade)
const { adminCount } = db.prepare("SELECT COUNT(*) as adminCount FROM users WHERE role = 'admin'").get()
if (adminCount === 0) {
  db.prepare('DELETE FROM notifications').run()
  db.prepare('UPDATE tasks SET assigned_to = NULL').run()
  db.prepare('DELETE FROM users').run()

  const adminPwd = process.env.ADMIN_SEED_PASSWORD || crypto.randomBytes(12).toString('base64url')
  const ssoPlaceholder = () => crypto.randomBytes(16).toString('hex')
  const USERS = [
    { email: 'admin@ine.mx',                  password: adminPwd,              name: 'Administrador del Sistema',           role: 'admin',        direccion: null },
    { email: 'anahi.silva@ine.mx',             password: ssoPlaceholder(),      name: 'Anahi Silva Tosca',                   role: 'ejecutiva',    direccion: null },
    { email: 'instruccion.recusal@ine.mx',     password: ssoPlaceholder(),      name: 'Director Instrucción Recursal',       role: 'director',     direccion: 'instruccion_recusal' },
    { email: 'contratos.convenios@ine.mx',     password: ssoPlaceholder(),      name: 'Director Contratos y Convenios',      role: 'director',     direccion: 'contratos_convenios' },
    { email: 'asuntos.hasl@ine.mx',            password: ssoPlaceholder(),      name: 'Director Asuntos HASL',               role: 'director',     direccion: 'asuntos_hasl' },
    { email: 'normatividad.consulta@ine.mx',   password: ssoPlaceholder(),      name: 'Director Normatividad y Consulta',    role: 'director',     direccion: 'normatividad_consulta' },
    { email: 'asuntos.laborales@ine.mx',       password: ssoPlaceholder(),      name: 'Director Asuntos Laborales',          role: 'director',     direccion: 'asuntos_laborales' },
    { email: 'servicios.legales@ine.mx',       password: ssoPlaceholder(),      name: 'Director Servicios Legales',          role: 'director',     direccion: 'servicios_legales' },
    { email: 'subdir.instruccion@ine.mx',      password: ssoPlaceholder(),      name: 'Subdirector Instrucción Recursal',    role: 'subdirector',  direccion: 'instruccion_recusal' },
    { email: 'subdir.contratos@ine.mx',        password: ssoPlaceholder(),      name: 'Subdirector Contratos y Convenios',   role: 'subdirector',  direccion: 'contratos_convenios' },
    { email: 'subdir.hasl@ine.mx',             password: ssoPlaceholder(),      name: 'Subdirector Asuntos HASL',            role: 'subdirector',  direccion: 'asuntos_hasl' },
    { email: 'subdir.normatividad@ine.mx',     password: ssoPlaceholder(),      name: 'Subdirector Normatividad y Consulta', role: 'subdirector',  direccion: 'normatividad_consulta' },
    { email: 'subdir.laborales@ine.mx',        password: ssoPlaceholder(),      name: 'Subdirector Asuntos Laborales',       role: 'subdirector',  direccion: 'asuntos_laborales' },
    { email: 'subdir.servicios@ine.mx',        password: ssoPlaceholder(),      name: 'Subdirector Servicios Legales',       role: 'subdirector',  direccion: 'servicios_legales' },
  ]
  const insert = db.prepare('INSERT INTO users (username, email, password_hash, name, role, direccion) VALUES (?, ?, ?, ?, ?, ?)')
  for (const u of USERS) {
    insert.run(u.email, u.email, bcrypt.hashSync(u.password, 10), u.name, u.role, u.direccion)
  }
  console.log(`✅ Usuarios seed creados. Admin: admin@ine.mx / ${adminPwd}  ← guarda esta contraseña`)
}

// Add secretaria user if not exists
try {
  const { spCount } = db.prepare("SELECT COUNT(*) as spCount FROM users WHERE role = 'secretaria'").get()
  if (spCount === 0) {
    db.prepare('INSERT OR IGNORE INTO users (username, email, password_hash, name, role, direccion) VALUES (?, ?, ?, ?, ?, ?)')
      .run('secretaria@ine.mx', 'secretaria@ine.mx', bcrypt.hashSync('Secretaria1234!', 10), 'Secretaría Particular', 'secretaria', null)
    console.log('✅ Usuario Secretaría Particular creado (secretaria@ine.mx / Secretaria1234!)')
  }
} catch (e) { console.error('Seed secretaria:', e.message) }

// Insert subdirectors if they don't exist yet (for DBs already seeded without them)
const { subdirCount } = db.prepare("SELECT COUNT(*) as subdirCount FROM users WHERE role = 'subdirector'").get()
if (subdirCount === 0) {
  const SUBDIRS = [
    { email: 'subdir.instruccion@ine.mx',      password: 'Subdir1234!',  name: 'Subdirector Instrucción Recursal',     direccion: 'instruccion_recusal' },
    { email: 'subdir.contratos@ine.mx',        password: 'Subdir1234!',  name: 'Subdirector Contratos y Convenios',    direccion: 'contratos_convenios' },
    { email: 'subdir.hasl@ine.mx',             password: 'Subdir1234!',  name: 'Subdirector Asuntos HASL',             direccion: 'asuntos_hasl' },
    { email: 'subdir.normatividad@ine.mx',     password: 'Subdir1234!',  name: 'Subdirector Normatividad y Consulta',  direccion: 'normatividad_consulta' },
    { email: 'subdir.laborales@ine.mx',        password: 'Subdir1234!',  name: 'Subdirector Asuntos Laborales',        direccion: 'asuntos_laborales' },
    { email: 'subdir.servicios@ine.mx',        password: 'Subdir1234!',  name: 'Subdirector Servicios Legales',        direccion: 'servicios_legales' },
  ]
  const insert = db.prepare('INSERT INTO users (username, email, password_hash, name, role, direccion) VALUES (?, ?, ?, ?, ?, ?)')
  for (const u of SUBDIRS) {
    insert.run(u.email, u.email, bcrypt.hashSync(u.password, 10), u.name, 'subdirector', u.direccion)
  }
  console.log('✅ Subdirectores agregados (contraseña: Subdir1234!)')
}

// Add fecha_vencimiento to convenios if not exists
try { db.exec("ALTER TABLE convenios ADD COLUMN fecha_vencimiento TEXT") } catch (_) {}
// Add responsable to convenios if not exists
try { db.exec("ALTER TABLE convenios ADD COLUMN responsable TEXT") } catch (_) {}
// Add date fields for oficios
try { db.exec("ALTER TABLE convenios ADD COLUMN fecha_atencion_obs_ur TEXT") } catch (_) {}
try { db.exec("ALTER TABLE convenios ADD COLUMN fecha_primera_revision TEXT") } catch (_) {}
try { db.exec("ALTER TABLE convenios ADD COLUMN fecha_segunda_revision TEXT") } catch (_) {}
try { db.exec("ALTER TABLE convenios ADD COLUMN fecha_validacion_juridica TEXT") } catch (_) {}
try { db.exec("ALTER TABLE convenios ADD COLUMN fecha_validacion_preliminar TEXT") } catch (_) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS convenios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo_convenio TEXT,
    tercero TEXT NOT NULL,
    oficio_solicitud TEXT,
    fecha_oficio TEXT,
    fecha_asignacion TEXT,
    id_sai TEXT,
    tema TEXT,
    oficio_primera_revision TEXT,
    atencion_obs_ur TEXT,
    oficio_segunda_revision TEXT,
    segunda_atencion_obs_ur TEXT,
    oficio_validacion_juridica TEXT,
    oficio_validacion_preliminar TEXT,
    numero_convenio TEXT,
    estatus TEXT DEFAULT 'revision',
    fecha_vencimiento TEXT,
    observaciones TEXT,
    created_by_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS dal_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    section TEXT NOT NULL,
    data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`)
try { db.exec('CREATE INDEX IF NOT EXISTS idx_dal_section ON dal_records(section)') } catch (_) {}

export default db
