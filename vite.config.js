import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    }
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['64.23.211.105']
  },
  build: {
    // Dividir el bundle en chunks más pequeños por área de feature
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Vendor: librerías externas en chunk consolidado libre de dependencias circulares
          if (id.includes('node_modules')) {
            if (id.includes('xlsx') || id.includes('exceljs')) return 'vendor-excel';
            if (id.includes('html2canvas') || id.includes('jspdf')) return 'vendor-pdf';
            if (id.includes('leaflet')) return 'vendor-maps';
            return 'vendor';
          }
        }
      }
    },
    // Subir límite de advertencia de chunk (los vendor bundles necesitan más espacio)
    chunkSizeWarningLimit: 600,
  }
})

