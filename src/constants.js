export const AREA_ABBREV = {
  instruccion_recusal:             'DIR',
  contratos_convenios:             'DCyC',
  asuntos_hasl:                    'DAHASL',
  normatividad_consulta:           'DNyC',
  asuntos_laborales:               'DAL',
  servicios_legales:               'DSL',
  secretaria_particular:           'SP',
  coordinacion_gestion_documental: 'CGD',
  enlace_interinstitucional:       'LEI',
}

export const DIRECCIONES = [
  {
    key: 'instruccion_recusal',
    label: 'Dir. de Instrucción Recursal',
    shortLabel: 'Instr. Recursal',
    fullLabel: 'Dirección de Instrucción Recursal',
    color: '#3B82F6',
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    border: 'border-blue-500',
    lightBg: 'bg-blue-50',
  },
  {
    key: 'contratos_convenios',
    label: 'Dir. de Contratos y Convenios',
    shortLabel: 'Contratos',
    fullLabel: 'Dirección de Contratos y Convenios',
    color: '#10B981',
    bg: 'bg-green-100',
    text: 'text-green-800',
    border: 'border-green-500',
    lightBg: 'bg-green-50',
  },
  {
    key: 'asuntos_hasl',
    label: 'Dir. de Asuntos HASL',
    shortLabel: 'HASL',
    fullLabel: 'Dirección de Asuntos HASL',
    color: '#F59E0B',
    bg: 'bg-amber-100',
    text: 'text-amber-800',
    border: 'border-amber-500',
    lightBg: 'bg-amber-50',
  },
  {
    key: 'normatividad_consulta',
    label: 'Dir. de Normatividad y Consulta',
    shortLabel: 'Normatividad',
    fullLabel: 'Dirección de Normatividad y Consulta',
    color: '#8B5CF6',
    bg: 'bg-purple-100',
    text: 'text-purple-800',
    border: 'border-purple-500',
    lightBg: 'bg-purple-50',
  },
  {
    key: 'asuntos_laborales',
    label: 'Dir. de Asuntos Laborales',
    shortLabel: 'Laborales',
    fullLabel: 'Dirección de Asuntos Laborales',
    color: '#EF4444',
    bg: 'bg-red-100',
    text: 'text-red-800',
    border: 'border-red-500',
    lightBg: 'bg-red-50',
  },
  {
    key: 'servicios_legales',
    label: 'Dir. de Servicios Legales',
    shortLabel: 'Serv. Legales',
    fullLabel: 'Dirección de Servicios Legales',
    color: '#14B8A6',
    bg: 'bg-teal-100',
    text: 'text-teal-800',
    border: 'border-teal-500',
    lightBg: 'bg-teal-50',
  },
  {
    key: 'secretaria_particular',
    label: 'Secretaría Particular',
    shortLabel: 'Sec. Particular',
    fullLabel: 'Secretaría Particular',
    color: '#EC4899',
    bg: 'bg-pink-100',
    text: 'text-pink-800',
    border: 'border-pink-500',
    lightBg: 'bg-pink-50',
  },
  {
    key: 'coordinacion_gestion_documental',
    label: 'Coord. de Gestión Documental',
    shortLabel: 'Gestión Doc.',
    fullLabel: 'Coordinación de Gestión Documental',
    color: '#6366F1',
    bg: 'bg-indigo-100',
    text: 'text-indigo-800',
    border: 'border-indigo-500',
    lightBg: 'bg-indigo-50',
  },
  {
    key: 'enlace_interinstitucional',
    label: 'Líder de Enlace Interinstitucional',
    shortLabel: 'Enlace',
    fullLabel: 'Líder de Enlace Interinstitucional',
    color: '#F97316',
    bg: 'bg-orange-100',
    text: 'text-orange-800',
    border: 'border-orange-500',
    lightBg: 'bg-orange-50',
  },
]

export const STATUS_CONFIG = {
  pendiente: {
    label: 'Pendiente',
    bg: 'rgba(217,119,6,.10)',
    color: '#92400E',
    border: 'rgba(217,119,6,.30)',
    dot: 'bg-amber-400',
    // legacy Tailwind classes kept for components not yet updated
    text: 'text-amber-800',
  },
  en_progreso: {
    label: 'En Progreso',
    bg: 'rgba(37,99,235,.09)',
    color: '#1D4ED8',
    border: 'rgba(37,99,235,.25)',
    dot: 'bg-blue-500',
    text: 'text-blue-700',
  },
  completada: {
    label: 'Completada',
    bg: 'rgba(5,150,105,.09)',
    color: '#047857',
    border: 'rgba(5,150,105,.25)',
    dot: 'bg-green-500',
    text: 'text-green-700',
  },
  vencida: {
    label: 'Vencida',
    bg: 'rgba(220,38,38,.09)',
    color: '#DC2626',
    border: 'rgba(220,38,38,.25)',
    dot: 'bg-red-500',
    text: 'text-red-700',
    noForm: true,
  },
}

export const PRIORITY_CONFIG = {
  alta: {
    label: 'Alta',
    bg: 'rgba(220,38,38,.09)',
    color: '#DC2626',
    border: 'rgba(220,38,38,.25)',
    icon: '▲',
  },
  media: {
    label: 'Media',
    bg: 'rgba(217,119,6,.10)',
    color: '#D97706',
    border: 'rgba(217,119,6,.30)',
    icon: '●',
  },
  baja: {
    label: 'Baja',
    bg: 'rgba(5,150,105,.09)',
    color: '#059669',
    border: 'rgba(5,150,105,.25)',
    icon: '▼',
  },
}

export function getDireccion(key) {
  return DIRECCIONES.find((d) => d.key === key) || DIRECCIONES[0]
}

export function localToday(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function getMondayOfCurrentWeek() {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1)
  const monday = new Date(today.setDate(diff))
  return localToday(monday)
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr.replace(' ', 'T') + 'Z')
  return d.toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatWeek(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const end = new Date(d)
  end.setDate(end.getDate() + 4)
  const opts = { month: 'short', day: 'numeric' }
  return `Semana del ${d.toLocaleDateString('es-MX', opts)} al ${end.toLocaleDateString('es-MX', opts)}`
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
