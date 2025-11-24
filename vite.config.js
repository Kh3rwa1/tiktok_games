import { defineConfig } from 'vite'

export default defineConfig({
  root: 'public',
  publicDir: '../public',
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  }
})
