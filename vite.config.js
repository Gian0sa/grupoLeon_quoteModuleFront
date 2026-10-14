import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import fs from 'fs'

/**
 * Plugin silencioso: registra únicamente la marca de tiempo (timestamp) en cada build
 * para que el Auto-Refresh Inteligente sepa cuándo hay una nueva versión.
 * NO contiene títulos, textos ni releaseNotes de modales.
 */
function autoVersionPlugin() {
  return {
    name: 'auto-version-updater',
    apply: 'build',
    buildStart() {
      try {
        const versionFilePath = path.resolve(__dirname, 'public/version.json');
        const updated = {
          buildTime: Date.now()
        };
        fs.writeFileSync(versionFilePath, JSON.stringify(updated, null, 2), 'utf-8');
      } catch (err) {
        console.warn('Error al actualizar version.json en build:', err);
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), autoVersionPlugin()],
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
            if (id.includes('recharts')) return 'vendor-charts';
            if (id.includes('tesseract.js')) return 'vendor-ocr';
            if (id.includes('socket.io-client')) return 'vendor-socket';
          }
        }
      }
    }
  }
})
