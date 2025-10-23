import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/backoffice/',
  server: {
    port: 3030,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext'
  }
})