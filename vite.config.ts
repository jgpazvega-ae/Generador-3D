import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' usa rutas relativas para que el sitio funcione en cualquier
// subpath de GitHub Pages sin importar mayúsculas/minúsculas del repo.
export default defineConfig({
  plugins: [react()],
  base: './',
})
