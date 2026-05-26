import React, { useState, useCallback, useEffect } from 'react'
import BrandLogo from './components/BrandLogo.jsx'
import Topnav from './components/Topnav.jsx'
import TaskList from './components/TaskList.jsx'
import TaskDetail from './components/TaskDetail.jsx'
import TaskForm from './components/TaskForm.jsx'
import ReportView from './components/ReportView.jsx'
import CalendarReport from './components/CalendarReport.jsx'
import EnlaceReports from './components/EnlaceReports.jsx'
import LoginPage from './components/LoginPage.jsx'
import UserManagement from './components/UserManagement.jsx'
import ConveniosView from './components/ConveniosView.jsx'
import ConveniosReport from './components/ConveniosReport.jsx'
import DALView from './components/DALView.jsx'
import { getToken, getUser, setAuth, clearAuth } from './auth.js'

export default function App() {
  const [token, setToken] = useState(() => getToken())
  const [user, setUser] = useState(() => getUser())
  const [ssoLoading, setSsoLoading] = useState(
    () => !!new URLSearchParams(window.location.search).get('sso_token')
  )

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const ssoToken = params.get('sso_token')
    if (!ssoToken) return
    fetch('/api/t2/auth/sso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sso_token: ssoToken }),
    })
      .then(r => r.json())
      .then(({ token: t, user: u }) => {
        if (t) {
          setAuth(t, u)
          setToken(t)
          setUser(u)
          setView('tasks')
          setSelectedTaskId(null)
          setEditingTask(null)
          setFilters({
            direccion: (u?.role === 'director' || u?.role === 'subdirector') ? (u?.direccion || '') : '',
            status: '',
            date_from: '',
            date_to: '',
            priority: '',
          })
          setRefreshKey(k => k + 1)
          window.history.replaceState({}, '', '/')
        }
        setSsoLoading(false)
      })
      .catch(() => setSsoLoading(false))
  }, [])

  const [view, setView] = useState('tasks')
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [editingTask, setEditingTask] = useState(null)
  const [filters, setFilters] = useState(() => {
    const u = getUser()
    return {
      direccion: (u?.role === 'director' || u?.role === 'subdirector') ? (u?.direccion || '') : '',
      status: '',
      date_from: '',
      date_to: '',
      priority: '',
    }
  })
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), [])

  const navigate = useCallback((newView, params = {}) => {
    setView(newView)
    if (params.taskId !== undefined) setSelectedTaskId(params.taskId)
    if (params.task !== undefined) setEditingTask(params.task)
  }, [])

  const handleFilterChange = useCallback((newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }))
    setView('tasks')
  }, [])

  const handleLogin = (tok, usr) => {
    setAuth(tok, usr)
    setToken(tok)
    setUser(usr)
    setView('tasks')
    setSelectedTaskId(null)
    setEditingTask(null)
    setFilters({
      direccion: (usr?.role === 'director' || usr?.role === 'subdirector') ? (usr?.direccion || '') : '',
      status: '',
      date_from: '',
      date_to: '',
      priority: '',
    })
    setRefreshKey((k) => k + 1)
  }

  const handleLogout = () => {
    clearAuth()
    setToken(null)
    setUser(null)
    setView('tasks')
  }

  const handleBack = () => {
    if (view === 'edit-task') navigate('task-detail', { taskId: editingTask?.id })
    else navigate('tasks')
  }

  if (ssoLoading) return (
    <div className="flex items-center justify-center h-screen bg-ine-bg">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-ine-border border-t-ine-purple rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-ine-dim">Iniciando sesión…</p>
      </div>
    </div>
  )

  if (!token || !user) return <LoginPage onLogin={handleLogin} />

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-ine-bg">
      <Topnav
        filters={filters}
        onFilterChange={handleFilterChange}
        onNavigate={navigate}
        currentView={view}
        user={user}
        onLogout={handleLogout}
        onNewTask={() => navigate('new-task')}
        onBack={handleBack}
        onNavigateTask={(id) => navigate('task-detail', { taskId: id })}
      />

      <main className="flex-1 overflow-auto min-h-0 p-3 sm:p-6">
        {view === 'tasks' && (
          <TaskList
            key={refreshKey}
            filters={filters}
            onFilterChange={handleFilterChange}
            onTaskClick={(id) => navigate('task-detail', { taskId: id })}
            onNewTask={() => navigate('new-task')}
            user={user}
          />
        )}
        {view === 'task-detail' && (
          <TaskDetail
            taskId={selectedTaskId}
            onBack={() => navigate('tasks')}
            onEdit={(task) => navigate('edit-task', { task })}
            onDeleted={() => { refresh(); navigate('tasks') }}
            onRefresh={refresh}
            user={user}
          />
        )}
        {view === 'new-task' && (
          <TaskForm
            onCancel={() => navigate('tasks')}
            onSaved={(task) => { refresh(); navigate('task-detail', { taskId: task.id }) }}
            initialFilters={filters}
            user={user}
          />
        )}
        {view === 'edit-task' && (
          <TaskForm
            task={editingTask}
            onCancel={() => navigate('task-detail', { taskId: editingTask?.id })}
            onSaved={(task) => { refresh(); navigate('task-detail', { taskId: task.id }) }}
            initialFilters={filters}
            user={user}
          />
        )}
        {view === 'report' && <ReportView user={user} />}
        {view === 'calendar' && <CalendarReport />}
        {view === 'enlace' && (user?.role === 'admin' || user?.role === 'ejecutiva' || user?.direccion === 'enlace_interinstitucional') && <EnlaceReports user={user} />}
        {view === 'users' && user?.role === 'admin' && <UserManagement />}
        {view === 'convenios' && (user?.role === 'admin' || user?.role === 'ejecutiva' || user?.role === 'secretaria' || user?.direccion === 'contratos_convenios') && <ConveniosView user={user} />}
        {view === 'convenios-report' && user?.role === 'admin' && <ConveniosReport />}
        {view === 'dal' && (user?.role === 'admin' || user?.role === 'ejecutiva' || user?.direccion === 'asuntos_laborales') && <DALView user={user} />}
        {view === 'dal-dashboard' && (user?.role === 'admin' || user?.role === 'ejecutiva') && <DALView user={user} dashboardOnly />}
      </main>

      <footer
        className="px-6 py-3 flex items-center justify-between flex-shrink-0"
        style={{ background: '#2A1239' }}
      >
        <div className="flex items-center gap-2">
          <BrandLogo size={16} className="opacity-50" />
          <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,.55)' }}>
            INE · DEAJ — Dirección Ejecutiva de Asuntos Jurídicos
          </span>
        </div>
        <span className="text-xs" style={{ color: 'rgba(255,255,255,.35)' }}>
          © {new Date().getFullYear()} Instituto Nacional Electoral
        </span>
      </footer>
    </div>
  )
}
