import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '', // 🎯 CRITICAL: Must be empty for Capacitor/Android
})