import React from 'react'

// Logo oficial del INE (Manual de Identidad Institucional 2026).
// No se redibuja: se usa el archivo maestro provisto en /logo-ine-reducido.svg.
// `size` se interpreta como la altura en px; el ancho se ajusta solo.
export default function BrandLogo({ size = 32, className = '', alt = 'Instituto Nacional Electoral' }) {
  return (
    <img
      src="/logo-ine-reducido.svg"
      alt={alt}
      className={className}
      style={{ height: size, width: 'auto', display: 'block', flexShrink: 0 }}
    />
  )
}
