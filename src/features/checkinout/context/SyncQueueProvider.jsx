import React, { createContext, useContext, useEffect, useRef } from "react";
import { useSyncQueue } from "../hooks/useSyncQueue";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import {
  registerVisitQueueFlush,
  unregisterVisitQueueFlush,
} from "../services/visitQueueFlush";

/**
 * Instancia única de la cola de sincronización para toda la app.
 *
 * Antes `useSyncQueue` se montaba por separado en VisitLogPage y MyVisitsPage:
 * había dos temporizadores y dos listeners de "online" compitiendo, y —sobre
 * todo— fuera de esas dos pantallas no se sincronizaba nada. Un vendedor que
 * recuperaba señal en el home y cerraba sesión ahí perdía la ventana de envío.
 *
 * Montado en App, la cola vive mientras viva la sesión.
 */
const SyncQueueContext = createContext(null);

export function SyncQueueProvider({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  // Sin sesión no se intenta enviar nada: las peticiones darían 401, el
  // interceptor pediría refresh, fallaría y forzaría un logout en bucle. La
  // cola sigue intacta en IndexedDB y se vacía al entrar.
  const queue = useSyncQueue({ enabled: isAuthenticated });
  const syncRef = useRef(queue.syncPending);
  syncRef.current = queue.syncPending;

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    // Permite que el cierre de sesión intente vaciar la cola antes de invalidar
    // el token.
    registerVisitQueueFlush(() => syncRef.current?.());

    // Al volver a primer plano (el vendedor reabre la app) se intenta enviar.
    const onVisible = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        syncRef.current?.();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      unregisterVisitQueueFlush();
    };
  }, [isAuthenticated]);

  return (
    <SyncQueueContext.Provider value={queue}>
      {children}
    </SyncQueueContext.Provider>
  );
}

// Forma neutra por si un componente se renderiza fuera del proveedor: evita que
// la pantalla reviente por leer propiedades de undefined.
const EMPTY_QUEUE = {
  pendingCount: 0,
  queueItems: [],
  isSyncing: false,
  syncPending: () => {},
  retryItem: () => {},
  retryGroup: () => {},
  removeItem: () => {},
  refreshQueue: () => {},
};

export function useSyncQueueContext() {
  const ctx = useContext(SyncQueueContext);
  if (!ctx) {
    console.warn("useSyncQueueContext usado fuera de SyncQueueProvider");
    return EMPTY_QUEUE;
  }
  return ctx;
}

export default SyncQueueProvider;
