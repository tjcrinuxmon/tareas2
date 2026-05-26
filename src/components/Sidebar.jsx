import React from 'react'
import { DIRECCIONES } from '../constants.js'
import BrandLogo from './BrandLogo.jsx'

const ROLE_LABELS = {
  admin:       'Administrador',
  ejecutiva:   'Dirección Ejecutiva',
  director:    'Director/a de Área',
  subdirector: 'Subdirector/a de Área',
  secretaria:  'Secretaría Particular',
}

export default function Sidebar({ open, onClose, filters, onFilterChange, onNavigate, currentView, user, onLogout }) {
  if (!open) return null

  const closeIfMobile = () => { if (window.innerWidth < 768) onClose?.() }

  const isActive      = (key) => filters.direccion === key && currentView === 'tasks'
  const isAllActive   = filters.direccion === '' && currentView === 'tasks'
  const isReport      = currentView === 'report'
  const isCalendar    = currentView === 'calendar'
  const isUsers       = currentView === 'users'
  const isEnlace          = currentView === 'enlace'
  const isConvenios       = currentView === 'convenios'
  const isConveniosReport = currentView === 'convenios-report'
  const isDal             = currentView === 'dal'
  const isDalDash         = currentView === 'dal-dashboard'

  const restricted      = user?.role === 'director' || user?.role === 'subdirector'
  const canSeeEnlace    = user?.role === 'admin' || user?.role === 'ejecutiva' || user?.direccion === 'enlace_interinstitucional'
  const canSeeConvenios = user?.role === 'admin' || user?.role === 'ejecutiva' || user?.role === 'secretaria' || user?.direccion === 'contratos_convenios'
  const canSeeDal       = user?.role === 'admin' || user?.role === 'ejecutiva' || user?.direccion === 'asuntos_laborales'
  const canSeeDalDash   = user?.role === 'admin' || user?.role === 'ejecutiva'
  const isAdmin         = user?.role === 'admin'

  const hasReportes          = canSeeEnlace || true || isAdmin
  const hasActividadesSemanales = canSeeConvenios || canSeeDal || canSeeDalDash

  return (
    <aside
      className="fixed inset-y-0 left-0 z-50 w-64 bg-white flex flex-col h-full flex-shrink-0 md:relative md:inset-auto md:z-auto"
      style={{ borderRight: '1px solid #E2D9EE', boxShadow: '1px 0 4px rgba(88,46,115,.04)' }}
    >
      {/* Header */}
      <div className="px-5 py-4" style={{ borderBottom: '1px solid #E2D9EE' }}>
        <div className="flex items-center gap-3">
          <BrandLogo size={36} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-ine-purple leading-none">INE · DEAJ</p>
            <p className="text-xs text-ine-muted leading-snug mt-0.5 truncate">
              Dirección Ejecutiva de<br/>Asuntos Jurídicos
            </p>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1.5 rounded-lg text-ine-dim hover:text-ine-purple hover:bg-ine-bg transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">

        {/* ── Principal ───────────────────────────────────────────── */}
        <SectionLabel>Principal</SectionLabel>

        {!restricted && (
          <NavItem
            active={isAllActive}
            onClick={() => { onFilterChange({ direccion: '', date_from: '', date_to: '' }); closeIfMobile() }}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            }
            label="Todas las Tareas"
          />
        )}

        <NavItem
          active={isCalendar}
          onClick={() => { onNavigate('calendar'); closeIfMobile() }}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
          label="Calendario"
        />

        {/* ── Reportes ────────────────────────────────────────────── */}
        {hasReportes && <SectionLabel>Reportes</SectionLabel>}

        {canSeeEnlace && (
          <NavItem
            active={isEnlace}
            onClick={() => { onNavigate('enlace'); closeIfMobile() }}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
            }
            label="Seguimiento Diario"
          />
        )}

        <NavItem
          active={isReport}
          onClick={() => { onNavigate('report'); closeIfMobile() }}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          }
          label="Reporte de Tareas"
        />

        {isAdmin && (
          <NavItem
            active={isConveniosReport}
            onClick={() => { onNavigate('convenios-report'); closeIfMobile() }}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
            label="Reporte de Convenios"
          />
        )}

        {/* ── Actividades Semanales ────────────────────────────────── */}
        {hasActividadesSemanales && <SectionLabel>Actividades Semanales</SectionLabel>}

        {canSeeConvenios && (
          <NavItem
            active={isConvenios}
            onClick={() => { onNavigate('convenios'); closeIfMobile() }}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            }
            label="Convenios"
          />
        )}

        {canSeeDal && (
          <NavItem
            active={isDal}
            onClick={() => { onNavigate('dal'); closeIfMobile() }}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M3 6h18M3 10h18M3 14h12M3 18h8" />
              </svg>
            }
            label="Asuntos Laborales"
          />
        )}

        {canSeeDalDash && (
          <NavItem
            active={isDalDash}
            onClick={() => { onNavigate('dal-dashboard'); closeIfMobile() }}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                  d="M11 3H3v8h8V3zm10 0h-8v5h8V3zm0 9h-8v9h8v-9zm-10 4H3v5h8v-5z" />
              </svg>
            }
            label="Dashboard Laborales"
          />
        )}

        {/* ── Administración ───────────────────────────────────────── */}
        {isAdmin && (
          <>
            <SectionLabel>Administración</SectionLabel>
            <NavItem
              active={isUsers}
              onClick={() => { onNavigate('users'); closeIfMobile() }}
              icon={
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              }
              label="Gestión de Usuarios"
            />
          </>
        )}

        {/* ── Direcciones ──────────────────────────────────────────── */}
        <SectionLabel top>Direcciones</SectionLabel>

        {DIRECCIONES.map((dir) => {
          const active = isActive(dir.key)
          const isMyArea = user?.direccion === dir.key
          const isLocked = restricted && !isMyArea
          if (isLocked) return null
          return (
            <button
              key={dir.key}
              onClick={() => { onFilterChange({ direccion: dir.key }); closeIfMobile() }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left"
              style={active ? { background: '#582E73', color: 'white' } : { color: '#6B5F78' }}
              onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = '#F8F5FB'; e.currentTarget.style.color = '#582E73' } }}
              onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#6B5F78' } }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: active ? 'white' : dir.color }} />
              <span className="leading-tight flex-1">{dir.label}</span>
              {isMyArea && !active && (
                <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{ background: dir.color + '20', color: dir.color, fontSize: 10 }}>
                  Mi área
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* User footer */}
      <div className="p-4" style={{ borderTop: '1px solid #E2D9EE' }}>
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
            style={{ background: '#582E73' }}
          >
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-ine-text truncate">{user?.name}</p>
            <p className="text-xs text-ine-dim truncate">
              {ROLE_LABELS[user?.role] || 'Usuario'}
            </p>
          </div>
          <button
            onClick={onLogout}
            title="Cerrar sesión"
            className="p-1.5 rounded-lg text-ine-dim hover:text-ine-purple hover:bg-ine-bg transition-colors flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}

function SectionLabel({ children, top = false }) {
  return (
    <p className={`px-3 ${top ? 'pt-4' : 'pt-3'} pb-1 text-xs font-bold text-ine-dim uppercase tracking-wider`}>
      {children}
    </p>
  )
}

function NavItem({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
      style={active ? { background: '#582E73', color: 'white', fontWeight: 600 } : { color: '#6B5F78' }}
      onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = '#F8F5FB'; e.currentTarget.style.color = '#582E73' } }}
      onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#6B5F78' } }}
    >
      <span style={active ? { color: 'white' } : { color: '#A090B0' }}>{icon}</span>
      {label}
    </button>
  )
}
