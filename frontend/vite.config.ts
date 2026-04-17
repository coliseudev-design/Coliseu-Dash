import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Build direto em ../public/ para o Cloudflare Pages servir como estático
// Configuração otimizada para sandbox com pouca memória
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../public'),
    emptyOutDir: false,
    minify: false, // desabilita minify para economizar memória no sandbox
    target: 'es2020',
    sourcemap: false,
    cssCodeSplit: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 5000,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: (info) => {
          if (info.name?.endsWith('.css')) return 'assets/index.css'
          return 'assets/[name][extname]'
        },
        // Bundle tudo em um único arquivo (sem chunks) para simplificar
        manualChunks: undefined,
        inlineDynamicImports: true,
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
