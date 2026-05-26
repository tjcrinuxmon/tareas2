import React, { useState, useEffect, useRef, useCallback } from 'react'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api.js'
import { getDireccion } from '../constants.js'

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return `hace ${Math.floor(diff / 86400)} d`
}

export default function NotificationBell({ onNavigateTask }) {
  const [notifications, setNotifications] = useState([])
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const unread = notifications.filter((n) => !n.read).length

  const fetch = useCallback(async () => {
    try { setNotifications(await getNotifications()) } catch {}
  }, [])

  useEffect(() => {
    fetch()
    const timer = setInterval(fetch, 30000)
    return () => clearInterval(timer)
  }, [fetch])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleClick = async (n) => {
    if (!n.read) {
      await markNotificationRead(n.id).catch(() => {})
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, read: 1 } : x))
    }
    if (n.task_id) onNavigateTask?.(n.task_id)
    setOpen(false)
  }

  const handleMarkAll = async () => {
    await markAllNotificationsRead().catch(() => {})
    setNotifications((prev) => prev.map((n) => ({ ...n, read: 1 })))
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 rounded-lg transition-colors"
        style={{ color: open ? '#582E73' : '#A090B0' }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#582E73'; e.currentTarget.style.background = '#F8F5FB' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = open ? '#582E73' : '#A090B0'; e.currentTarget.style.background = '' }}
        title="Notificaciones"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 flex items-center justify-center rounded-full text-white font-bold"
            style={{ background: '#E4007B', minWidth: 16, height: 16, fontSize: 10, padding: '0 3px' }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 ine-card z-50 overflow-hidden fade-in"
          style={{ boxShadow: '0 20px 60px rgba(88,46,115,.20)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #EDE8F4' }}>
            <p className="text-xs font-bold text-ine-text uppercase tracking-wide">Notificaciones</p>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs font-medium transition-colors"
                style={{ color: '#582E73' }}
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          {/* List */}
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="w-10 h-10 rounded-full flex items-center justify-center mx-auto mb-2" style={{ background: '#F8F5FB' }}>
                  <svg className="w-5 h-5 text-ine-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <p className="text-xs text-ine-dim">Sin notificaciones</p>
              </div>
            ) : (
              notifications.map((n) => {
                const dir = n.direccion ? getDireccion(n.direccion) : null
                return (
                  <button
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                    style={{
                      borderBottom: '1px solid #EDE8F4',
                      background: n.read ? 'white' : 'rgba(88,46,115,.04)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#F8F5FB'}
                    onMouseLeave={(e) => e.currentTarget.style.background = n.read ? 'white' : 'rgba(88,46,115,.04)'}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                      style={{ background: n.read ? '#E2D9EE' : '#E4007B' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs leading-snug" style={{ color: n.read ? '#6B5F78' : '#1A1219', fontWeight: n.read ? 400 : 600 }}>
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {dir && (
                          <span className="text-xs font-medium" style={{ color: dir.color }}>{dir.label}</span>
                        )}
                        <span className="text-xs text-ine-dim">{timeAgo(n.created_at)}</span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
