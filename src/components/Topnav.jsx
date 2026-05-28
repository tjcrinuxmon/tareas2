import React, { useState, useRef, useEffect } from 'react'
import { DIRECCIONES } from '../constants.js'
import BrandLogo from './BrandLogo.jsx'
import NotificationBell from './NotificationBell.jsx'

const ROLE_LABELS = {
  admin:       'Administrador',
  ejecutiva:   'Dir. Ejecutiva',
  director:    'Director/a',
  subdirector: 'Subdirector/a',
  secretaria:  'Secretaría Particular',
}

export default function Topnav({
  filters, onFilterChange, onNavigate, currentView,
  user, onLogout, onNewTask, onBack, onNavigateTask,
}) {
  const [openMenu, setOpenMenu] = useState(null) // 'area' | 'reportes' | 'actividades' | 'admin' | null
  const navRef = useRef(null)

  useEffect(() => {
    if (!openMenu) return
    const handler = (e) => {
      if (navRef.current && !navRef.current.contains(e.target)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenu])

  const toggle = (name) => setOpenMenu(prev => prev === name ? null : name)
  const close  = ()     => setOpenMenu(null)

  const nav = (view) => { close(); onNavigate(view) }
  const flt = (f)    => { close(); onFilterChange(f) }

  const restricted      = user?.role === 'director' || user?.role === 'subdirector'
  const canSeeEnlace    = user?.role === 'admin' || user?.role === 'ejecutiva' || user?.direccion === 'enlace_interinstitucional'
  const canSeeConvenios = user?.role === 'admin' || user?.role === 'ejecutiva' || user?.role === 'secretaria' || user?.direccion === 'contratos_convenios'
  const canSeeDal       = user?.role === 'admin' || user?.role === 'ejecutiva' || user?.direccion === 'asuntos_laborales'
  const canSeeDalDash   = user?.role === 'admin' || user?.role === 'ejecutiva'
  const isAdmin         = user?.role === 'admin'
  const canSeeOficios   = true

  const activeDir    = DIRECCIONES.find(d => d.key === filters.direccion)
  const isAllActive  = filters.direccion === '' && currentView === 'tasks'
  const isMyActive   = filters.direccion === (user?.direccion || '') && currentView === 'tasks'
  const reportActive = ['enlace', 'report', 'convenios-report'].includes(currentView)
  const actActive    = ['convenios', 'dal', 'dal-dashboard', 'oficios'].includes(currentView)
  const adminActive  = currentView === 'users'

  const hasActividades = canSeeConvenios || canSeeDal || canSeeDalDash || canSeeOficios

  return (
    <header
      className="bg-white flex items-center px-4 gap-0 flex-shrink-0"
      style={{ height: 60, borderBottom: '1px solid #E2D9EE', boxShadow: '0 1px 4px rgba(0,0,0,.05)', zIndex: 40 }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 flex-shrink-0 pr-4" style={{ borderRight: '1px solid #E2D9EE' }}>
        <BrandLogo size={30} />
        <div className="hidden sm:block leading-none">
          <p className="text-sm font-black text-ine-purple">INE · DEAJ</p>
          <p className="text-xs text-ine-muted">Módulo de Tareas</p>
        </div>
      </div>

      {/* Nav items */}
      <nav ref={navRef} className="flex items-center gap-0.5 flex-1 px-2">

        {/* Dashboard */}
        <NavBtn
          active={currentView === 'dashboard'}
          onClick={() => nav('dashboard')}
          icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10-10h8v8h-8V3zm0 10h8v8h-8v-8z"/></svg>}
          label="Panel"
        />

        {/* Tareas */}
        {!restricted ? (
          <NavBtn
            active={isAllActive}
            onClick={() => flt({ direccion: '', date_from: '', date_to: '' })}
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
            label="Tareas"
          />
        ) : (
          <NavBtn
            active={isMyActive}
            onClick={() => flt({ direccion: user?.direccion || '' })}
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>}
            label="Mis Tareas"
          />
        )}

        {/* Calendario */}
        <NavBtn
          active={currentView === 'calendar'}
          onClick={() => { close(); onNavigate('calendar') }}
          icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>}
          label="Calendario"
        />

        {/* Área dropdown */}
        {currentView === 'tasks' && !restricted && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => toggle('area')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap"
              style={activeDir
                ? { background: activeDir.color + '18', color: activeDir.color, border: `1px solid ${activeDir.color}40` }
                : { color: '#6B5F78', border: '1px solid #E2D9EE', background: 'white' }
              }
            >
              {activeDir
                ? <><span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: activeDir.color }} />{activeDir.shortLabel}</>
                : 'Área'
              }
              <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
            </button>
            {openMenu === 'area' && (
              <DropMenu style={{ minWidth: 230 }}>
                <DropItem
                  active={!activeDir}
                  onClick={() => flt({ direccion: '', date_from: '', date_to: '' })}
                  dot="#A090B0"
                  label="Todas las áreas"
                />
                <div style={{ borderTop: '1px solid #E2D9EE', margin: '4px 0' }} />
                {DIRECCIONES.map(dir => (
                  <DropItem
                    key={dir.key}
                    active={filters.direccion === dir.key}
                    onClick={() => flt({ direccion: dir.key })}
                    dot={dir.color}
                    label={dir.label}
                    badge={user?.direccion === dir.key ? { text: 'Mi área', color: dir.color } : null}
                  />
                ))}
              </DropMenu>
            )}
          </div>
        )}

        <Separator />

        {/* Reportes dropdown */}
        <div className="relative flex-shrink-0">
          <NavBtn
            active={reportActive}
            hasArrow
            onClick={() => toggle('reportes')}
            icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
            label="Reportes"
          />
          {openMenu === 'reportes' && (
            <DropMenu>
              {canSeeEnlace && (
                <DropItem
                  active={currentView === 'enlace'}
                  onClick={() => nav('enlace')}
                  icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2"/></svg>}
                  label="Seguimiento Diario"
                />
              )}
              <DropItem
                active={currentView === 'report'}
                onClick={() => nav('report')}
                icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
                label="Reporte de Tareas"
              />
              {isAdmin && (
                <DropItem
                  active={currentView === 'convenios-report'}
                  onClick={() => nav('convenios-report')}
                  icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>}
                  label="Reporte de Convenios"
                />
              )}
            </DropMenu>
          )}
        </div>

        {/* Actividades dropdown */}
        {hasActividades && (
          <div className="relative flex-shrink-0">
            <NavBtn
              active={actActive}
              hasArrow
              onClick={() => toggle('actividades')}
              icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>}
              label="Actividades"
            />
            {openMenu === 'actividades' && (
              <DropMenu>
                {canSeeConvenios && (
                  <DropItem
                    active={currentView === 'convenios'}
                    onClick={() => nav('convenios')}
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>}
                    label="Convenios"
                  />
                )}
                {canSeeDal && (
                  <DropItem
                    active={currentView === 'dal'}
                    onClick={() => nav('dal')}
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3 6h18M3 10h18M3 14h12M3 18h8"/></svg>}
                    label="Asuntos Laborales"
                  />
                )}
                {canSeeDalDash && (
                  <DropItem
                    active={currentView === 'dal-dashboard'}
                    onClick={() => nav('dal-dashboard')}
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M11 3H3v8h8V3zm10 0h-8v5h8V3zm0 9h-8v9h8v-9zm-10 4H3v5h8v-5z"/></svg>}
                    label="Dashboard Laborales"
                  />
                )}
                {canSeeOficios && (
                  <DropItem
                    active={currentView === 'oficios'}
                    onClick={() => nav('oficios')}
                    icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>}
                    label="Oficios"
                  />
                )}
              </DropMenu>
            )}
          </div>
        )}

        {/* Administración dropdown */}
        {isAdmin && (
          <div className="relative flex-shrink-0">
            <NavBtn
              active={adminActive}
              hasArrow
              onClick={() => toggle('admin')}
              icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>}
              label="Administración"
            />
            {openMenu === 'admin' && (
              <DropMenu>
                <DropItem
                  active={currentView === 'users'}
                  onClick={() => nav('users')}
                  icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>}
                  label="Gestión de Usuarios"
                />
              </DropMenu>
            )}
          </div>
        )}
      </nav>

      {/* Right side */}
      <div className="flex items-center gap-1.5 flex-shrink-0 pl-3" style={{ borderLeft: '1px solid #E2D9EE' }}>
        <NotificationBell onNavigateTask={onNavigateTask} />

        {currentView === 'tasks' && (
          <button onClick={onNewTask} className="btn-ine" style={{ padding: '7px 14px', fontSize: 12 }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden sm:inline">Nueva Tarea</span>
          </button>
        )}

        {(currentView === 'task-detail' || currentView === 'edit-task') && (
          <button onClick={onBack} className="btn-outline" style={{ padding: '7px 14px', fontSize: 12 }}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Volver</span>
          </button>
        )}

        <div className="flex items-center gap-2 pl-2" style={{ borderLeft: '1px solid #E2D9EE' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
            style={{ background: '#582E73' }}>
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="hidden md:block leading-none">
            <p className="text-xs font-semibold text-ine-text truncate max-w-[100px]">{user?.name}</p>
            <p className="text-xs text-ine-dim mt-0.5">{ROLE_LABELS[user?.role] || 'Usuario'}</p>
          </div>
          <button onClick={onLogout} title="Volver al portal"
            className="p-1.5 rounded-lg text-ine-dim hover:text-ine-purple hover:bg-ine-bg transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

function NavBtn({ active, onClick, icon, label, hasArrow = false }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all whitespace-nowrap flex-shrink-0"
      style={active ? { background: '#582E73', color: 'white', fontWeight: 600 } : { color: '#6B5F78' }}
      onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#F8F5FB'; e.currentTarget.style.color = '#582E73' } }}
      onMouseLeave={e => { if (!active) { e.currentTarget.style.background = ''; e.currentTarget.style.color = '#6B5F78' } }}
    >
      <span style={active ? { color: 'white' } : { color: '#A090B0' }}>{icon}</span>
      {label}
      {hasArrow && (
        <svg className="w-3 h-3 opacity-50 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      )}
    </button>
  )
}

function Separator() {
  return <span className="flex-shrink-0" style={{ width: 1, height: 20, background: '#E2D9EE', margin: '0 4px' }} />
}

function DropMenu({ children, style = {} }) {
  return (
    <div
      className="absolute top-full mt-1 left-0 bg-white rounded-lg py-1 z-50"
      style={{ border: '1px solid #E2D9EE', boxShadow: '0 8px 24px rgba(88,46,115,.14)', minWidth: 200, ...style }}
    >
      {children}
    </div>
  )
}

function DropItem({ active, onClick, icon, dot, label, badge }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-left transition-colors"
      style={active ? { color: '#582E73', fontWeight: 700, background: '#F8F5FB' } : { color: '#6B5F78' }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = '#F8F5FB' }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = '' }}
    >
      {dot  && <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dot }} />}
      {icon && <span style={active ? { color: '#582E73' } : { color: '#A090B0' }}>{icon}</span>}
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="text-xs px-1.5 rounded-full font-semibold"
          style={{ background: badge.color + '20', color: badge.color, fontSize: 10 }}>
          {badge.text}
        </span>
      )}
      {active && (
        <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
        </svg>
      )}
    </button>
  )
}
