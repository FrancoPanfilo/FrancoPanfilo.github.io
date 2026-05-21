import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/AzaleaGolf/PalosUsados/',
  build: {
    outDir: '../../AzaleaGolf/PalosUsados',
    emptyOutDir: true,
  },
})
