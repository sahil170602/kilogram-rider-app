import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 🎯 CRITICAL: This MUST be an empty string or './' 
  // to force all paths to be relative.
  base: '', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // Helps with older Android WebViews
    target: 'es2015',
  }
})