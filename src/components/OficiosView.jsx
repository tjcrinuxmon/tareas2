import React, { useState, useEffect } from 'react'
import { getOficios, createOficio, downloadOficio } from '../api.js'
import { localToday } from '../constants.js'

function formatDisplayDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  const meses = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
  return `${d} ${meses[m - 1]} ${y}`
}

export default function OficiosView({ user }) {
  const [oficios, setOficios]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [view, setView]             = useState('list') // 'list' | 'form'
  const [downloading, setDownloading] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)

  const [form, setForm] = useState({
    fecha: localToday(),
    asunto: '',
    destinatario_nombre: '',
    destinatario_cargo: '',
    destinatario_area: '',
    cuerpo: '',
    ccp_extra: '',
  })

  const loadOficios = () => {
    setLoading(true)
    getOficios()
      .then(setOficios)
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadOficios() }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    if (!form.fecha || !form.asunto.trim() || !form.destinatario_nombre.trim() || !form.destinatario_cargo.trim() || !form.cuerpo.trim()) {
      setError('Completa todos los campos obligatorios.')
      return
    }
    setSubmitting(true)
    try {
      await createOficio(form)
      setView('list')
      setForm({ fecha: localToday(), asunto: '', destinatario_nombre: '', destinatario_cargo: '', destinatario_area: '', cuerpo: '', ccp_extra: '' })
      loadOficios()
    } catch (err) {
      setError(err.response?.data?.error || 'Error al crear el oficio.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownload = async (oficio) => {
    setDownloading(oficio.id)
    try {
      const blob = await downloadOficio(oficio.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${oficio.numero_completo.replace(/\//g, '-')}.docx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (_) {
      alert('Error al descargar el documento.')
    } finally {
      setDownloading(null)
    }
  }

  if (view === 'form') {
    return (
      <div className="fade-in max-w-3xl mx-auto">
        <div className="bg-white rounded-xl mb-6 px-5 py-4"
          style={{ border: '1.5px solid #E2D9EE', borderLeft: '5px solid #582E73', boxShadow: '0 2px 8px rgba(88,46,115,.07)' }}>
          <h2 className="text-lg font-bold text-ine-text">Nuevo Oficio</h2>
          <p className="text-xs text-ine-muted mt-0.5">Se generará el documento Word listo para descargar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Número y Fecha */}
          <div className="bg-white rounded-xl p-5" style={{ border: '1.5px solid #E2D9EE' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#9CA3AF' }}>Identificación</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-ine-text mb-1">Número de oficio</label>
                <div className="px-3 py-2 rounded-lg text-sm font-mono text-ine-dim"
                  style={{ background: '#F8F5FB', border: '1.5px solid #E2D9EE' }}>
                  INE/DEAJ/[auto]/{new Date().getFullYear()}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ine-text mb-1">Fecha <span className="text-red-500">*</span></label>
                <input
                  type="date" name="fecha" value={form.fecha} onChange={handleChange} required
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1.5px solid #E2D9EE', outline: 'none' }}
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-ine-text mb-1">Asunto <span className="text-red-500">*</span></label>
              <input
                type="text" name="asunto" value={form.asunto} onChange={handleChange}
                placeholder="Descripción breve del asunto" required
                className="w-full px-3 py-2 rounded-lg text-sm"
                style={{ border: '1.5px solid #E2D9EE', outline: 'none' }}
              />
            </div>
          </div>

          {/* Destinatario */}
          <div className="bg-white rounded-xl p-5" style={{ border: '1.5px solid #E2D9EE' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#9CA3AF' }}>Destinatario</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-ine-text mb-1">Nombre <span className="text-red-500">*</span></label>
                <input
                  type="text" name="destinatario_nombre" value={form.destinatario_nombre} onChange={handleChange}
                  placeholder="Lic. Nombre Apellido" required
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1.5px solid #E2D9EE', outline: 'none' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ine-text mb-1">Cargo <span className="text-red-500">*</span></label>
                <input
                  type="text" name="destinatario_cargo" value={form.destinatario_cargo} onChange={handleChange}
                  placeholder="Director/a General de..." required
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1.5px solid #E2D9EE', outline: 'none' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ine-text mb-1">Área / Institución <span className="text-ine-muted text-xs font-normal">(opcional)</span></label>
                <input
                  type="text" name="destinatario_area" value={form.destinatario_area} onChange={handleChange}
                  placeholder="Instituto Nacional Electoral"
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ border: '1.5px solid #E2D9EE', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Cuerpo */}
          <div className="bg-white rounded-xl p-5" style={{ border: '1.5px solid #E2D9EE' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#9CA3AF' }}>Cuerpo del oficio</h3>
            <textarea
              name="cuerpo" value={form.cuerpo} onChange={handleChange}
              placeholder="Redacta aquí el contenido del oficio. Cada línea en blanco creará un párrafo separado."
              rows={10} required
              className="w-full px-3 py-2 rounded-lg text-sm resize-y"
              style={{ border: '1.5px solid #E2D9EE', outline: 'none', fontFamily: 'inherit', lineHeight: '1.6' }}
            />
          </div>

          {/* Firma */}
          <div className="bg-white rounded-xl p-5" style={{ border: '1.5px solid #E2D9EE' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: '#9CA3AF' }}>Firma</h3>
            <div className="px-4 py-3 rounded-lg" style={{ background: '#F8F5FB' }}>
              <p className="text-sm font-bold text-ine-text">{user?.name?.toUpperCase()}</p>
              <p className="text-xs text-ine-muted mt-0.5">{user?.puesto || 'Directora Ejecutiva de Asuntos Jurídicos'}</p>
            </div>
          </div>

          {/* C.c.p. */}
          <div className="bg-white rounded-xl p-5" style={{ border: '1.5px solid #E2D9EE' }}>
            <h3 className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: '#9CA3AF' }}>C.c.p.</h3>
            <p className="text-xs text-ine-muted mb-3">
              Se incluyen automáticamente: <span className="font-medium">Consejera Presidenta</span> y <span className="font-medium">Secretaria Ejecutiva</span>
            </p>
            <div>
              <label className="block text-xs font-semibold text-ine-text mb-1">Destinatarios adicionales <span className="text-ine-muted text-xs font-normal">(uno por línea, opcional)</span></label>
              <textarea
                name="ccp_extra" value={form.ccp_extra} onChange={handleChange}
                placeholder={"Titular de la Dirección X.\nSecretario/a de..."}
                rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm resize-y"
                style={{ border: '1.5px solid #E2D9EE', outline: 'none', fontFamily: 'inherit' }}
              />
            </div>
          </div>

          {error && (
            <div className="px-4 py-3 rounded-lg text-sm font-medium" style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' }}>
              {error}
            </div>
          )}

          <div className="flex gap-3 pb-6">
            <button type="submit" disabled={submitting} className="btn-ine" style={{ opacity: submitting ? 0.6 : 1 }}>
              {submitting ? 'Generando...' : 'Crear oficio'}
            </button>
            <button type="button" onClick={() => { setView('list'); setError(null) }} className="btn-outline">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    )
  }

  // List view
  return (
    <div className="fade-in max-w-5xl mx-auto">
      <div className="bg-white rounded-xl mb-6 px-5 py-4 flex items-center justify-between"
        style={{ border: '1.5px solid #E2D9EE', borderLeft: '5px solid #582E73', boxShadow: '0 2px 8px rgba(88,46,115,.07)' }}>
        <div>
          <h2 className="text-lg font-bold text-ine-text">Oficios</h2>
          <p className="text-xs text-ine-muted mt-0.5">Generación y registro de oficios INE · DEAJ</p>
        </div>
        <button className="btn-ine" onClick={() => { setView('form'); setError(null) }}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Oficio
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 rounded-full animate-spin" style={{ borderColor: '#E2D9EE', borderTopColor: '#582E73' }} />
        </div>
      ) : oficios.length === 0 ? (
        <div className="bg-white rounded-xl py-16 text-center" style={{ border: '1.5px solid #E2D9EE' }}>
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: '#582E73' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
          </svg>
          <p className="text-sm font-semibold text-ine-text">No hay oficios registrados</p>
          <p className="text-xs text-ine-muted mt-1">Crea el primer oficio con el botón de arriba</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden" style={{ border: '1.5px solid #E2D9EE', boxShadow: '0 2px 8px rgba(88,46,115,.05)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #E2D9EE', background: '#F8F5FB' }}>
                <th className="px-5 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Número</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Fecha</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Asunto</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide hidden md:table-cell" style={{ color: '#9CA3AF' }}>Destinatario</th>
                <th className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wide hidden lg:table-cell" style={{ color: '#9CA3AF' }}>Firmante</th>
                <th className="px-4 py-3 text-right text-xs font-bold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Descarga</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {oficios.map(o => (
                <tr key={o.id} className="hover:bg-ine-bg transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded" style={{ background: '#F3EFF8', color: '#582E73' }}>
                      {o.numero_completo}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-ine-muted whitespace-nowrap">{formatDisplayDate(o.fecha)}</td>
                  <td className="px-4 py-3 text-xs text-ine-text max-w-[220px] truncate">{o.asunto}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-xs font-medium text-ine-text truncate max-w-[160px]">{o.destinatario_nombre}</p>
                    <p className="text-xs text-ine-muted truncate max-w-[160px]">{o.destinatario_cargo}</p>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    <p className="text-xs text-ine-text truncate max-w-[140px]">{o.firmante_nombre}</p>
                    <p className="text-xs text-ine-muted truncate max-w-[140px]">{o.firmante_cargo}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDownload(o)}
                      disabled={downloading === o.id}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                      style={{ background: '#F3EFF8', color: '#582E73', border: '1px solid #E2D9EE', opacity: downloading === o.id ? 0.5 : 1 }}
                    >
                      {downloading === o.id ? (
                        <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin inline-block" style={{ borderColor: '#E2D9EE', borderTopColor: '#582E73' }} />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                      )}
                      .docx
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
