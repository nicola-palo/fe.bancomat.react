import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Per GitHub Pages: usa il nome del repo come base path
  // Se il repo si chiama "ATM", la base sarà "/ATM/"
  // Se usi un dominio custom o username.github.io, usa "/"
  base: process.env.NODE_ENV === 'production' ? '/ATM/' : '/',
  server: {
    port: 5173,
    // Il proxy funziona solo in dev, in prod si usano le URL in .env.production
    proxy: {
      '/api/chat': {
        target: 'http://localhost:8081',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})
