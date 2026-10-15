import { useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { socket } from '../shared/lib/socket';
import { CAMERA_PENDING_KEY } from '../features/checkinout/utils/checkinSession';

const LOCAL_STORAGE_KEY = 'autopartes_installed_build_time';
const LOCAL_STORAGE_VERSION_KEY = 'autopartes_installed_version';
const CHECK_INTERVAL_MS = 2.5 * 60 * 1000; // Verificación periódica cada 2.5 minutos
// Pantallas donde recargar destruye trabajo que vive solo en memoria (foto recién tomada).
const PROTECTED_PATHS = ['/visitlog'];

/**
 * Al volver de la cámara nativa el navegador dispara visibilitychange con la RAM al mínimo.
 * Recargar en ese instante pierde la foto y obliga a re-descargar todo el bundle,
 * que es lo que en equipos de 4 GB termina en "memoria insuficiente".
 */
const isReloadUnsafe = (path) => {
  try {
    if (sessionStorage.getItem(CAMERA_PENDING_KEY)) return true;
  } catch (_) { /* Storage bloqueado: decidir solo por la ruta. */ }
  const normalized = String(path || '').toLowerCase();
  return PROTECTED_PATHS.some((p) => normalized === p || normalized.startsWith(p + '/'));
};

/**
 * Hook para Auto-Refresh Inteligente (100% Automático y Seguro)
 * Sin ningún modal ni botón para evitar problemas con fuentes gigantes de Android.
 * 
 * Criterios de actualización inteligente:
 * 1. Si está en el Login ('/' o '/login'): Se recarga de inmediato de forma transparente.
 * 2. Si el vendedor bloquea el teléfono o minimiza la app: Al volver a desbloquearla
 *    (visibilitychange: visible), se refresca sola con la última versión limpia sin interrumpirle nada.
 * 3. Si está navegando o cambiando de menú: Se aplica el refresh al cambiar de página
 *    para que nunca le corte una cotización ni formulario en progreso.
 */
export function useAppUpdater() {
  const location = useLocation();
  const locationRef = useRef(location.pathname);
  locationRef.current = location.pathname;

  const prevPathRef = useRef(location.pathname);
  const pendingUpdateRef = useRef(null);
  const isReloadingRef = useRef(false);
  const checkingRef = useRef(false);
  const justResumedRef = useRef(false);
  const resumeTimerRef = useRef(null);

  /**
   * Ejecuta la purga total de caché y recarga limpia de la aplicación
   */
  const performCleanReload = useCallback(async (remoteData) => {
    if (isReloadingRef.current) return;
    isReloadingRef.current = true;

    console.log('🔄 [AutoUpdater] Ejecutando refresh limpio y automático hacia versión:', remoteData?.version);

    try {
      // 1. Guardar la nueva versión en localStorage PRIMERO para evitar bucle de recarga
      if (remoteData?.buildTime) {
        localStorage.setItem(LOCAL_STORAGE_KEY, String(remoteData.buildTime));
      } else {
        localStorage.setItem(LOCAL_STORAGE_KEY, String(Date.now()));
      }
      if (remoteData?.version) {
        localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, String(remoteData.version));
      }

      // 2. Activar el Service Worker nuevo. No se purgan las cachés: los chunks llevan hash
      // y el HTML es network-first, así que borrarlas solo forzaba a re-descargar todo en cada deploy.
      if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
          if (reg.active) {
            reg.active.postMessage({ type: 'SKIP_WAITING' });
          }
          await reg.update().catch(() => {});
        }
      }

      // 3. Desconectar socket limpiamente para evitar polling huérfano con error 400
      try {
        socket.disconnect();
      } catch (_) {}

    } catch (err) {
      console.warn('⚠️ [AutoUpdater] Error durante la purga preliminar:', err);
    }

    // 4. Recarga limpia del navegador sin modal ni botones
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  }, []);

  /**
   * Consulta el archivo /version.json sin usar caché de red
   */
  const checkForUpdates = useCallback(async () => {
    if (checkingRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

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

      // Si es la primera vez que abre la app en este celular/navegador, registramos su versión actual
      if (!installedBuildTime) {
        localStorage.setItem(LOCAL_STORAGE_KEY, String(remoteData.buildTime || Date.now()));
        localStorage.setItem(LOCAL_STORAGE_VERSION_KEY, remoteData.version || '2.4.0');
        return;
      }

      const isNewerBuild = remoteData.buildTime && Number(remoteData.buildTime) > Number(installedBuildTime);
      const isNewerVersion = remoteData.version && installedVersion && remoteData.version !== installedVersion;

      if (isNewerBuild || isNewerVersion) {
        console.log('🚀 [AutoUpdater] Nueva versión detectada en servidor:', remoteData.version);

        const currentPath = locationRef.current;
        const isLoginPage = currentPath === '/' || currentPath === '/login';

        // 🟢 Criterio 1: Si está en el Login, recarga inmediata y transparente
        if (isLoginPage) {
          console.log('🟢 [AutoUpdater] En pantalla de Login. Aplicando refresh transparente de inmediato...');
          performCleanReload(remoteData);
          return;
        }

        // 🟢 Criterio 2: Si el usuario acaba de desbloquear el teléfono o volver a la app
        // (salvo que vuelva de la cámara o esté en el check-in: ahí se pospone)
        if (justResumedRef.current && !isReloadUnsafe(currentPath)) {
          console.log('🟢 [AutoUpdater] Teléfono desbloqueado / app restaurada. Aplicando refresh limpio...');
          performCleanReload(remoteData);
          return;
        }

        // 🟢 Criterio 3: En cualquier otra vista activa (ej: cotización en progreso),
        // guardamos la actualización pendiente para aplicarla al cambiar de página
        console.log('⏳ [AutoUpdater] Cotización o pantalla activa. Actualización pospuesta hasta cambio de menú o bloqueo de pantalla.');
        pendingUpdateRef.current = remoteData;
      }
    } catch (err) {
      console.warn('⚠️ [AutoUpdater] No se pudo verificar version.json:', err);
    } finally {
      checkingRef.current = false;
    }
  }, [performCleanReload]);

  /**
   * Criterio 3: Detección de navegación o cambio de menú
   */
  useEffect(() => {
    if (prevPathRef.current !== location.pathname) {
      const from = prevPathRef.current;
      const to = location.pathname;
      prevPathRef.current = to;

      if (pendingUpdateRef.current && !isReloadUnsafe(to)) {
        console.log(`🚀 [AutoUpdater] Navegando de "${from}" a "${to}". Aplicando refresh automático con última versión...`);
        const updateToApply = pendingUpdateRef.current;
        pendingUpdateRef.current = null;
        performCleanReload(updateToApply);
      }
    }
  }, [location.pathname, performCleanReload]);

  /**
   * Monitoreo de eventos: visibilidad, periodicidad y WebSocket
   */
  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    // 1. Verificación inicial al cargar
    checkForUpdates();

    // 2. Verificación periódica en segundo plano
    const interval = setInterval(() => {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        checkForUpdates();
      }
    }, CHECK_INTERVAL_MS);

    // 3. Criterio 2: Evento visibilitychange (bloquear/desbloquear o minimizar/volver)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Si ya teníamos una actualización pendiente detectada mientras trabajaba
        if (pendingUpdateRef.current) {
          // Volver de la cámara también dispara este evento: no recargar encima de la foto.
          if (isReloadUnsafe(locationRef.current)) return;
          console.log('🟢 [AutoUpdater] Pantalla desbloqueada con actualización pendiente. Aplicando refresh limpio...');
          const updateToApply = pendingUpdateRef.current;
          pendingUpdateRef.current = null;
          performCleanReload(updateToApply);
          return;
        }

        // Si no había pendiente, marcamos bandera temporal y comprobamos en servidor
        justResumedRef.current = true;
        if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
        resumeTimerRef.current = setTimeout(() => {
          justResumedRef.current = false;
        }, 10000); // 10 segundos de ventana de desbloqueo seguro

        if (typeof navigator !== 'undefined' && navigator.onLine) {
          checkForUpdates();
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Señal remota por WebSocket
    const handleRemoteSignal = () => {
      console.log('⚡ [AutoUpdater] Señal de actualización remota recibida.');
      checkForUpdates();
    };
    window.addEventListener('app:check_updates_now', handleRemoteSignal);

    // 5. Utilidad de prueba para la consola de desarrollo
    window.__triggerAppUpdateMock = (newVersion = '2.5.0-mock') => {
      const mockData = { version: newVersion, buildTime: Date.now() + 100000 };
      if (locationRef.current === '/' || locationRef.current === '/login' || justResumedRef.current) {
        performCleanReload(mockData);
      } else {
        pendingUpdateRef.current = mockData;
        console.log('🧪 [AutoUpdater Mock] Actualización pendiente registrada. Cambia de menú o bloquea/desbloquea la pantalla para ver el refresh.');
      }
    };

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('app:check_updates_now', handleRemoteSignal);
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
      delete window.__triggerAppUpdateMock;
    };
  }, [checkForUpdates, performCleanReload]);

  return {
    checkForUpdates,
    performCleanReload,
    isUpdateAvailable: false,
  };
}
