import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    // Matches the backend's CORS allowlist (settings.ALLOWED_ORIGIN defaults to
    // localhost:5173) -- jsdom's default origin is plain http://localhost/ with no
    // port, which the backend doesn't allow, so any test hitting the real local
    // backend would have its fetch silently CORS-blocked otherwise.
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:5173',
      },
    },
  },
})
