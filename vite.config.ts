import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Keep the prototype URL stable for demos / Figma handoff.
    port: 5183,
    strictPort: true,
  },
})
