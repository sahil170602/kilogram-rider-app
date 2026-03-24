import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 🎯 CRITICAL: This fixes the MIME type error on Android
  base: '', 
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    // 🎯 Ensures your JS files are compatible with older WebViews
    target: 'esnext', 
    minify: false, // Set to true for production later, false now for easier debugging
  }
})