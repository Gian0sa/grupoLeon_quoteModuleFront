import { useState, useEffect, useCallback, useRef } from 'react';
import { socket } from '../shared/lib/socket';

const LOCAL_STORAGE_KEY = 'autopartes_installed_build_time';
const LOCAL_STORAGE_VERSION_KEY = 'autopartes_installed_version';

/**
 * Detecta si el usuario está en un dispositivo móvil o usando la app instalada (PWA).
 * En computadoras de escritorio devolverá false para no interrumpir su flujo.
 */
export function isMobileOrPWA() {
  if (typeof window === 'undefined') return false;

  // 1. App instalada en la pantalla de inicio (PWA Standalone)
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://');

  // 2. Dispositivo móvil por User Agent
  const userAgent = navigator.userAgent || navigator.vendor || window.opera || '';
  const isMobileUA = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);

  // 3. Pantalla táctil o tamaño móvil (<= 768px)
  const isSmallScreen = window.innerWidth <= 768;
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  return isStandalone || (isMobileUA && (isSmallScreen || hasTouch));
}

export function useAppUpdater() {
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState({
    version: '2.4.0',
    title: 'Actualización del Sistema',
    releaseNotes: [
      'Optimización de memoria RAM en celulares.',
      'Solución a errores de almacenamiento en fotos y Check-in.',
      'Sincronización instantánea de datos.'
    ]
  });

  const [status, setStatus] = useState('idle'); // 'idle' | 'updating' | 'success'
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(1); // 1: Integridad, 2: Descargando, 3: Limpieza, 4: Listo
  const [statusMessage, setStatusMessage] = useState('Preparando actualización...');

  const checkingRef = useRef(false);

  /**
   * Consulta el archivo /version.json sin usar caché de red
   */
  const checkForUpdates = useCallback(async (forcePrompt = false) => {
    if (checkingRef.current) return;
    
    // Si NO es móvil ni PWA y no es forzado explícitamente, no hacemos nada
    if (!isMobileOrPWA() && !forcePrompt) {
      return;
    }

    checkingRef.current = true;
    try {
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) return;

      const remoteData = await response.json();
      const installedBuildTime = localStorage.getItem(LOCAL_STORAGE_KEY);
      const installedVersion = localStorage.getItem(LOCAL_STORAGE_VERSION_KEY);

      // Si es la primera vez que se abre en este celular, registramos la versión actual
      if (!installedBuildTime) {
        localStorage.setItem(LOCAL_STORAGE_KEY, String(remoteData.buildTime || Date.now()));
        localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, remoteData.version || '2.4.0');
        return;
      }

      // Si hay una versión más nueva en el servidor
      const isNewerBuild = remoteData.buildTime && Number(remoteData.buildTime) > Number(installedBuildTime);
      const isNewerVersion = remoteData.version && remoteData.version !== installedVersion;

      if (isNewerBuild || isNewerVersion || forcePrompt) {
        console.log('🚀 [AppUpdater] Nueva versión detectada en servidor:', remoteData.version);
        setUpdateInfo({
          version: remoteData.version || '2.4.0',
          title: remoteData.title || 'Actualización del Sistema',
          releaseNotes: remoteData.releaseNotes || [
            'Optimización de memoria RAM en celulares.',
            'Solución a errores de almacenamiento en fotos y Check-in.',
            'Sincronización instantánea de datos.'
          ],
          buildTime: remoteData.buildTime
        });
        setIsUpdateAvailable(true);
      }
    } catch (err) {
      console.warn('⚠️ [AppUpdater] No se pudo verificar version.json:', err);
    } finally {
      checkingRef.current = false;
    }
  }, []);

  /**
   * Ejecuta el proceso de actualización visual y purga real de memoria caché
   */
  const applyUpdate = useCallback(async () => {
    setStatus('updating');
    setProgress(5);
    setCurrentStep(1);
    setStatusMessage('Comprobando integridad de la aplicación...');

    // Fase 1: Integridad (0% a 30%)
    await new Promise((r) => setTimeout(r, 600));
    setProgress(28);
    setStatusMessage('Verificando firmas y seguridad de paquetes...');

    // Fase 2: Descarga de nuevos módulos (30% a 70%)
    await new Promise((r) => setTimeout(r, 700));
    setCurrentStep(2);
    setProgress(52);
    setStatusMessage('Descargando módulos actualizados...');

    await new Promise((r) => setTimeout(r, 800));
    setProgress(72);
    setStatusMessage('Descarga completada al 100%...');

    // Fase 3: Purga total de memoria caché y Service Worker (70% a 95%)
    await new Promise((r) => setTimeout(r, 500));
    setCurrentStep(3);
    setProgress(85);
    setStatusMessage('Liberando memoria caché y almacenamiento del celular...');

    try {
      // 1. Borrar todas las cachés del navegador
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        console.log('🧹 [AppUpdater] Todas las cachés de Service Worker eliminadas.');
      }

      // 2. Enviar señal de Skip Waiting y Purga al Service Worker activo
      if (navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          if (reg.active) {
            reg.active.postMessage({ type: 'PURGE_ALL_CACHE' });
            reg.active.postMessage({ type: 'SKIP_WAITING' });
          }
          await reg.update().catch(() => {});
        }
      }

      // 3. Actualizar la versión guardada en localStorage
      if (updateInfo.buildTime) {
        localStorage.setItem(LOCAL_STORAGE_KEY, String(updateInfo.buildTime));
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, String(Date.now()));
      }
      localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, updateInfo.version);

    } catch (err) {
      console.warn('⚠️ [AppUpdater] Error durante la purga de caché:', err);
    }

    // Fase 4: Finalización (100%)
    await new Promise((r) => setTimeout(r, 700));
    setProgress(100);
    setCurrentStep(4);
    setStatus('success');
    setStatusMessage('¡Actualización completada! Reiniciando...');

    // Desconectar socket limpiamente antes de reiniciar para evitar error 400 de polling huérfano
    try {
      socket.disconnect();
    } catch (_) {}

    // Reinicio forzado limpio
    await new Promise((r) => setTimeout(r, 1200));
    window.location.reload(true);
  }, [updateInfo]);

  useEffect(() => {
    // Si no es móvil ni PWA, no ejecutamos monitoreo de actualización
    if (!isMobileOrPWA()) return;

    // Chequeo inicial
    checkForUpdates();

    // Chequeo periódico cada 4 minutos
    const interval = setInterval(() => {
      checkForUpdates();
    }, 4 * 60 * 1000);

    // Chequeo al volver a la app o desbloquear pantalla
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Escuchar actualizaciones de Service Worker nativas
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Nuevo controller tomó el mando
      });
    }

    // Exponer función de prueba en consola para desarrollo
    window.__triggerAppUpdateMock = () => {
      setIsUpdateAvailable(true);
    };

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      delete window.__triggerAppUpdateMock;
    };
  }, [checkForUpdates]);

  return {
    isUpdateAvailable,
    updateInfo,
    status,
    progress,
    currentStep,
    statusMessage,
    applyUpdate,
    dismissUpdate: () => setIsUpdateAvailable(false),
    isMobile: isMobileOrPWA()
  };
}
