import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // 🎯 Use an empty string for the base path
  base: '', 
  build: {
    outDir: 'dist',
    // 🎯 Use 'es2015' for maximum compatibility with Android phones
    target: 'es2015',
    cssTarget: 'chrome61',
    assetsDir: 'assets',
    modulePreload: { polyfill: true }
  }
})