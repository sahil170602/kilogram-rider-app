import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '', // 🎯 Keeps all paths relative
  build: {
    outDir: 'dist',
    // 🎯 Target older browsers (Chrome 61+ / Android 6+)
    target: ['chrome61', 'es2015'], 
    cssTarget: 'chrome61',
    modulePreload: { polyfill: true },
    rollupOptions: {
      output: {
        // 🎯 Simple naming to prevent path confusion
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    }
  }
})