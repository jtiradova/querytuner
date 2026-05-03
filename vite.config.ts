import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Expose on LAN interfaces and align with the printed Network URL; also
    // avoids some localhost vs 127.0.0.1 / IPv6 edge cases.
    host: true,
    // Standard Vite port; if busy, Vite picks the next free port — check the
    // terminal for the exact "Local:" URL after `npm run dev`.
    port: 5173,
    strictPort: false,
  },
})
