import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const isVercel = !!process.env.VERCEL;

export default defineConfig({
  plugins: [react()],
  base: isVercel ? '/' : '/AzaleaGolf/PalosUsados/',
  build: {
    outDir: isVercel ? 'dist' : '../../AzaleaGolf/PalosUsados',
    emptyOutDir: true,
  },
})
