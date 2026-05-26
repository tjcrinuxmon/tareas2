import React, { useState, useEffect, useCallback } from 'react'
import { adminGetUsers, adminCreateUser, adminUpdateUser, adminDeleteUser } from '../api.js'
import { DIRECCIONES } from '../constants.js'

const ROLES = [
  { key: 'admin',       label: 'Administrador',         color: '#7C3AED' },
  { key: 'ejecutiva',   label: 'Directora Ejecutiva',   color: '#E4007B' },
  { key: 'director',    label: 'Director de Área',      color: '#582E73' },
  { key: 'subdirector', label: 'Subdirector de Área',   color: '#2563EB' },
]

const roleCfg = (key) => ROLES.find((r) => r.key === key) || { label: key, color: '#6B5F78' }
const needsDireccion = (role) => role === 'director' || role === 'subdirector'

const EMPTY_FORM = { name: '', email: '', password: '', role: 'director', direccion: DIRECCIONES[0].key, puesto: '' }

export default function UserManagement() {
  const [users, setUsers]               = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState(null)
  const [modal, setModal]               = useState(null)   // null | 'create' | user-object
  const [confirmDelete, setConfirmDelete] = useState(null) // null | user-object
  const [deleting, setDeleting]         = useState(false)

  const fetch = useCallback(async () => {
    setLoading(true); setError(null)
    try { setUsers(await adminGetUsers()) }
    catch { setError('Error al cargar los usuarios.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const handleSaved = (saved) => {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === saved.id)
      return idx >= 0 ? prev.map((u) => u.id === saved.id ? saved : u) : [...prev, saved]
    })
    setModal(null)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await adminDeleteUser(confirmDelete.id)
      setUsers((prev) => prev.filter((u) => u.id !== confirmDelete.id))
      setConfirmDelete(null)
    } catch (err) {
      alert(err?.response?.data?.error || 'Error al eliminar el usuario.')
    } finally {
      setDeleting(false)
    }
  }

  const grouped = ROLES.map((r) => ({ ...r, items: users.filter((u) => u.role === r.key) }))
    .filter((g) => g.items.length > 0)

  return (
    <div className="fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div
        className="bg-white rounded-xl mb-5 px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderLeft: '5px solid #582E73', border: '1.5px solid #E2D9EE', borderLeft: '5px solid #582E73', boxShadow: '0 2px 8px rgba(88,46,115,.07)' }}
      >
        <div>
          <h2 className="text-lg font-bold text-ine-text">Gestión de Usuarios</h2>
          <p className="text-xs text-ine-muted mt-0.5">{users.length} usuario{users.length !== 1 ? 's' : ''} registrados en el sistema</p>
        </div>
        <button onClick={() => setModal('create')} className="btn-ine">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Usuario
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-10 h-10 border-4 rounded-full animate-spin mb-4"
               style={{ borderColor: '#E2D9EE', borderTopColor: '#582E73' }} />
          <p className="text-ine-muted text-sm">Cargando usuarios...</p>
        </div>
      ) : error ? (
        <div className="ine-card p-8 text-center" style={{ border: '1.5px solid rgba(220,38,38,.22)' }}>
          <p className="font-semibold" style={{ color: '#B91C1C' }}>{error}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ key, label, color, items }) => (
            <div key={key}>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                <h3 className="text-sm font-bold text-ine-text">{label}</h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: color + '18', color }}>
                  {items.length}
                </span>
                <div className="flex-1 h-px bg-ine-border" />
              </div>
              <div className="ine-card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr style={{ background: '#F8F5FB', borderBottom: '1px solid #EDE8F4' }}>
                      <th className="px-4 py-2.5 text-left text-xs font-bold text-ine-muted uppercase tracking-wide">Nombre</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold text-ine-muted uppercase tracking-wide">Correo</th>
                      <th className="px-4 py-2.5 text-left text-xs font-bold text-ine-muted uppercase tracking-wide hidden sm:table-cell">Dirección de Área</th>
                      <th className="px-4 py-2.5 text-right text-xs font-bold text-ine-muted uppercase tracking-wide">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((u, i) => {
                      const dir = DIRECCIONES.find((d) => d.key === u.direccion)
                      return (
                        <tr key={u.id} style={{ borderBottom: i < items.length - 1 ? '1px solid #EDE8F4' : undefined }}
                            onMouseEnter={(e) => e.currentTarget.style.background = '#F8F5FB'}
                            onMouseLeave={(e) => e.currentTarget.style.background = ''}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                   style={{ background: color }}>
                                {u.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-ine-text">{u.name}</span>
                                {u.role === 'subdirector' && u.puesto && (
                                  <p className="text-xs text-ine-muted leading-tight mt-0.5">{u.puesto}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-ine-muted">{u.email}</span>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            {dir ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full"
                                    style={{ background: dir.color + '15', color: dir.color }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: dir.color }} />
                                {dir.label}
                              </span>
                            ) : (
                              <span className="text-xs text-ine-dim">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setModal(u)}
                                className="p-1.5 rounded-lg transition-colors text-ine-dim hover:text-ine-purple hover:bg-ine-bg"
                                title="Editar"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => setConfirmDelete(u)}
                                className="p-1.5 rounded-lg transition-colors"
                                style={{ color: '#DC2626' }}
                                title="Eliminar"
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(220,38,38,.07)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = ''}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modal !== null && (
        <UserModal
          user={modal === 'create' ? null : modal}
          onSaved={handleSaved}
          onClose={() => setModal(null)}
        />
      )}

      {/* Delete confirm */}
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
            <h3 className="text-lg font-bold text-ine-text text-center mb-1">¿Eliminar usuario?</h3>
            <p className="text-sm text-ine-muted text-center mb-6">
              Se eliminará <span className="font-semibold text-ine-text">{confirmDelete.name}</span>. Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)} disabled={deleting} className="btn-outline flex-1 justify-center">
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white rounded-lg disabled:opacity-60"
                style={{ background: '#DC2626' }}
              >
                {deleting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function UserModal({ user, onSaved, onClose }) {
  const isEdit = !!user
  const [form, setForm] = useState({
    name:      user?.name      || '',
    email:     user?.email     || '',
    password:  '',
    role:      user?.role      || 'director',
    direccion: user?.direccion || DIRECCIONES[0].key,
    puesto:    user?.puesto    || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const [showPass, setShowPass] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) { setError('Nombre y correo son requeridos.'); return }
    if (!isEdit && !form.password) { setError('La contraseña es requerida al crear un usuario.'); return }
    setSaving(true); setError(null)
    try {
      const payload = {
        name:      form.name.trim(),
        email:     form.email.trim().toLowerCase(),
        role:      form.role,
        direccion: needsDireccion(form.role) ? form.direccion : null,
        puesto:    form.role === 'subdirector' ? form.puesto.trim() : null,
      }
      if (form.password) payload.password = form.password
      const saved = isEdit
        ? await adminUpdateUser(user.id, payload)
        : await adminCreateUser(payload)
      onSaved(saved)
    } catch (err) {
      setError(err?.response?.data?.error || 'Error al guardar.')
    } finally {
      setSaving(false)
    }
  }

  const rc = roleCfg(form.role)

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4"
         style={{ background: 'rgba(42,18,57,.45)', backdropFilter: 'blur(4px)' }}>
      <div className="bg-white rounded-xl w-full max-w-md fade-in overflow-hidden"
           style={{ border: '1.5px solid #E2D9EE', boxShadow: '0 20px 60px rgba(88,46,115,.20)' }}>
        {/* Color bar */}
        <div className="h-1" style={{ background: rc.color }} />

        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #EDE8F4' }}>
          <h3 className="text-base font-bold text-ine-text">{isEdit ? 'Editar Usuario' : 'Nuevo Usuario'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ine-dim hover:text-ine-purple hover:bg-ine-bg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm"
                 style={{ background: 'rgba(220,38,38,.07)', border: '1px solid rgba(220,38,38,.22)', color: '#B91C1C' }}>
              {error}
            </div>
          )}

          <div>
            <label className="ine-label">Nombre completo <span className="text-red-500">*</span></label>
            <input type="text" name="name" value={form.name} onChange={handleChange}
              placeholder="Ej. María López García" required className="ine-input" />
          </div>

          <div>
            <label className="ine-label">Correo electrónico <span className="text-red-500">*</span></label>
            <input type="email" name="email" value={form.email} onChange={handleChange}
              placeholder="nombre@ine.mx" required className="ine-input" />
          </div>

          <div>
            <label className="ine-label">
              Contraseña {isEdit && <span className="text-ine-dim font-normal normal-case">(dejar vacío para no cambiar)</span>}
              {!isEdit && <span className="text-red-500"> *</span>}
            </label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                placeholder={isEdit ? '••••••••' : 'Mínimo 8 caracteres'}
                className="ine-input" style={{ paddingRight: '36px' }} />
              <button type="button" onClick={() => setShowPass((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ine-dim hover:text-ine-purple transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showPass
                    ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    : <><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></>
                  }
                </svg>
              </button>
            </div>
          </div>

          <div>
            <label className="ine-label">Rol <span className="text-red-500">*</span></label>
            <select name="role" value={form.role} onChange={handleChange} className="ine-input">
              {ROLES.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
            </select>
          </div>

          {needsDireccion(form.role) && (
            <div>
              <label className="ine-label">Dirección de Área <span className="text-red-500">*</span></label>
              <select name="direccion" value={form.direccion} onChange={handleChange} className="ine-input">
                {DIRECCIONES.map((d) => <option key={d.key} value={d.key}>{d.fullLabel}</option>)}
              </select>
            </div>
          )}

          {form.role === 'subdirector' && (
            <div>
              <label className="ine-label">Puesto / Subdirección</label>
              <input type="text" name="puesto" value={form.puesto} onChange={handleChange}
                placeholder="Ej. Subdirectora de Resoluciones y Análisis"
                className="ine-input" />
            </div>
          )}
        </form>

        <div className="px-6 py-4 flex justify-end gap-3"
             style={{ background: '#F8F5FB', borderTop: '1px solid #E2D9EE' }}>
          <button type="button" onClick={onClose} disabled={saving} className="btn-outline">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-ine">
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {isEdit ? 'Guardar Cambios' : 'Crear Usuario'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
