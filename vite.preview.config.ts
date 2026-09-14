import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Renderer-only preview config: no Electron plugin, so the UI can be
// inspected in a plain browser during development.
export default defineConfig({
  root: __dirname,
  plugins: [react()],
  server: {
    port: 5199,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
