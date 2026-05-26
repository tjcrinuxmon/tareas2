import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/tareas2/',
  server: {
    host: '0.0.0.0',
    port: 5175,
    proxy: {
      '/api/t2': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/t2/, '/api'),
      },
      '/uploads/t2': {
        target: 'http://localhost:3005',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/uploads\/t2/, '/uploads'),
      },
    }
  }
})
