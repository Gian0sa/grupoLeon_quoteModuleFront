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
          // Vendor: librerías externas en chunks separados (se cachean por mucho tiempo)
          if (id.includes('node_modules')) {
            if (id.includes('framer-motion'))     return 'vendor-framer';
            if (id.includes('@chakra-ui') || id.includes('@emotion')) return 'vendor-chakra';
            if (id.includes('react-dom'))          return 'vendor-react';
            if (id.includes('@tanstack'))          return 'vendor-query';
            if (id.includes('socket.io') || id.includes('engine.io') || id.includes('xmlhttprequest')) return 'vendor-socket';
            if (id.includes('leaflet') || id.includes('react-leaflet')) return 'vendor-maps';
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) return 'vendor-charts';
            if (id.includes('react-pdf') || id.includes('pdfmake') || id.includes('pdfkit') || id.includes('html2canvas')) return 'vendor-pdf';
            if (id.includes('axios'))              return 'vendor-axios';
            if (id.includes('zustand'))            return 'vendor-zustand';
            if (id.includes('react-hook-form') || id.includes('zod') || id.includes('@hookform')) return 'vendor-forms';
            if (id.includes('lucide') || id.includes('react-icons') || id.includes('@heroicons')) return 'vendor-icons';
            if (id.includes('react-select') || id.includes('react-datepicker') || id.includes('flatpickr')) return 'vendor-pickers';
            if (id.includes('dompurify') || id.includes('sanitize') || id.includes('isomorphic-dompurify')) return 'vendor-sanitize';
            if (id.includes('xlsx') || id.includes('exceljs') || id.includes('file-saver') || id.includes('jszip')) return 'vendor-excel';
            if (id.includes('qrcode') || id.includes('jsqr') || id.includes('html5-qrcode')) return 'vendor-qr';
            if (id.includes('react-router') || id.includes('@remix-run')) return 'vendor-router';
            if (id.includes('date-fns') || id.includes('dayjs') || id.includes('moment')) return 'vendor-dates';
            if (id.includes('swiper') || id.includes('keen-slider') || id.includes('embla')) return 'vendor-carousel';
            return 'vendor-misc';
          }

          // Feature chunks: cada área de la app en su propio archivo
          if (id.includes('/features/quotes/'))       return 'feature-quotes';
          if (id.includes('/features/clients/'))      return 'feature-clients';
          if (id.includes('/features/reports/'))      return 'feature-reports';
          if (id.includes('/features/dashboard/'))    return 'feature-dashboard';
          if (id.includes('/features/catalog/'))      return 'feature-catalog';
          if (id.includes('/features/receivable/'))   return 'feature-receivable';
          if (id.includes('/features/checkinout/'))   return 'feature-checkinout';
          if (id.includes('/features/entrada/'))      return 'feature-entrada';
          if (id.includes('/features/supervisor/'))   return 'feature-supervisor';
          if (id.includes('/features/products/'))     return 'feature-products';
          if (id.includes('/features/imports/'))      return 'feature-imports';
          if (id.includes('/features/admin/'))        return 'feature-admin';
          if (id.includes('/features/help/'))         return 'feature-help';
          if (id.includes('/features/auth/'))         return 'feature-auth';
        }
      }
    },
    // Subir límite de advertencia de chunk (los vendor bundles necesitan más espacio)
    chunkSizeWarningLimit: 600,
  }
})

