import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', // Per dominio personalizzato, usa '/' invece di '/repo-name/'
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false
  },
  server: {
    // Configurazione per development
    host: 'localhost',
    port: 5173
  },
  preview: {
    // Configurazione per preview locale della build
    host: 'localhost', 
    port: 4173
  }
})
