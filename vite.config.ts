import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Ensure proper SPA routing with Vercel
  build: {
    // Generate sourcemaps for better debugging
    sourcemap: true,
  },
  // Configure base path if needed (usually not needed for Vercel)
  // base: '/',
  // Configure server settings
  server: {
    port: 3000,
    // Ensure proper HMR with Vercel development
    hmr: {
      overlay: true,
    },
  },
})