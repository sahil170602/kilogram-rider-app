import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
impor

export default defineConfig({
  plugins: [react()],
  base: '', // 🎯 CRITICAL: Must be empty for Capacitor/Android
})