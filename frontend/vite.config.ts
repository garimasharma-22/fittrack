
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Enables React and Tailwind CSS in Vite.
  plugins: [react(), tailwindcss()],
})
