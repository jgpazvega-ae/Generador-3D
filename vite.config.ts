import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' usa rutas relativas para que el sitio funcione en cualquier
// subpath de GitHub Pages sin importar mayúsculas/minúsculas del repo.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    // Three.js and ONNX runtime are already code-split into separate lazy chunks;
    // raising the limit suppresses false-positive warnings for these expected large deps.
    chunkSizeWarningLimit: 800,
  },
})
