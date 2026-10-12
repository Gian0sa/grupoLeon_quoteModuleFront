import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import fs from 'fs'

function autoVersionPlugin() {
  return {
    name: 'auto-version-updater',
    apply: 'build',
    buildStart() {
      try {
        const versionFilePath = path.resolve(__dirname, 'public/version.json');
        let current = {};
        if (fs.existsSync(versionFilePath)) {
          current = JSON.parse(fs.readFileSync(versionFilePath, 'utf-8'));
        }
        const now = new Date();
        const updated = {
          version: current.version || '2.4.0',
          buildTime: Date.now(),
          buildDate: now.toISOString(),
          title: 'Actualización del Sistema',
          releaseNotes: current.releaseNotes || [
            'Optimización de memoria RAM en celulares.',
            'Solución a errores de almacenamiento en fotos y Check-in.',
            'Sincronización instantánea de datos y mayor fluidez.'
          ]
        };
        fs.writeFileSync(versionFilePath, JSON.stringify(updated, null, 2), 'utf-8');
        console.log(`\n📦 [AutoVersion] public/version.json actualizado (buildTime: ${updated.buildTime})\n`);
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
            return 'vendor';
          }
        }
      }
    },
    // Subir límite de advertencia de chunk (los vendor bundles necesitan más espacio)
    chunkSizeWarningLimit: 600,
  }
})

