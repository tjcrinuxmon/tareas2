import React from 'react'

/**
 * Ícono del sistema — dos gráficos PIDI:
 *   Contornos: documento de tareas (#582E73 morado DEAJ)
 *   Sólido:    círculo de completado (#D5007F magenta INE)
 */
export default function BrandLogo({ size = 32, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ flexShrink: 0 }}
    >
      {/* ── Contornos: documento de tareas (morado) ── */}
      {/* Cuerpo del documento con esquina doblada */}
      <path
        d="M3 4h15l4 4v18H3V4z"
        stroke="#582E73"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* Doblez de esquina */}
      <path
        d="M18 4v4h4"
        stroke="#582E73"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Líneas de tareas — decrecientes */}
      <line x1="6" y1="12" x2="17" y2="12" stroke="#582E73" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="6" y1="16" x2="14" y2="16" stroke="#582E73" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="6" y1="20" x2="10" y2="20" stroke="#582E73" strokeWidth="1.3" strokeLinecap="round" />

      {/* ── Sólido: círculo de completado (magenta #D5007F) ── */}
      <circle cx="23" cy="23" r="9" fill="#D5007F" />
      <path
        d="M19.5 23L22 25.5L27 19.5"
        stroke="white"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
