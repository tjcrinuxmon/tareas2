import { useEffect } from 'react'

export default function LoginPage() {
  useEffect(() => {
    const base = import.meta.env.VITE_PORTAL_URL || window.location.origin.replace(/:(3001|3005|5175)$/, ':3000')
    window.location.replace(base)
  }, [])
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', fontFamily:'sans-serif', color:'#582E73', fontSize:14 }}>
      Redirigiendo al portal…
    </div>
  )
}
