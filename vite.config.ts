import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  base: '/polestar-log-viewer/', // Crucial for GitHub Pages hosting at /repo-name/
  plugins: [
    tailwindcss(),
    react()
  ],
})