import { useEffect, useCallback, useState, useRef } from "react";
import { useToast } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getQueue,
  removeFromQueue,
  storableToFormData,
  getQueueCount,
  updateQueueItem,
} from "../services/visitLogQueue";
import { createVisitLog } from "../services/visitLogService";

export const useSyncQueue = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [queueItems, setQueueItems] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Ref para evitar loops e hilos concurrentes estables en useCallback
  const isSyncingRef = useRef(false);

  // Refresca el contador y los items de la cola (sin dependencias para estabilidad)
  const refreshQueue = useCallback(async () => {
    try {
      const count = await getQueueCount();
      setPendingCount(count);
      const items = await getQueue();
      setQueueItems(items.sort((a, b) => a.id - b.id));
    } catch (error) {
      console.error("Error refreshing queue:", error);
    }
  }, []);

  const syncPending = useCallback(async () => {
    // Evita ejecuciones concurrentes usando la referencia
    if (isSyncingRef.current) return;

    const items = await getQueue();
    if (items.length === 0) {
      setPendingCount(0);
      setQueueItems([]);
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);
    console.log(`🔄 Sincronizando ${items.length} check-in(s)/out(s) pendientes...`);
    let syncedCount = 0;

    // Orden cronológico por ID
    const sortedQueue = items.sort((a, b) => a.id - b.id);

    for (const item of sortedQueue) {
      if (item.status === "SYNCED") {
        await removeFromQueue(item.id);
        continue;
      }

      try {
        await updateQueueItem(item.id, { status: "SYNCING" });
        await refreshQueue();

        const { id, _queuedAt, status, errorMessage, ...data } = item;
        const formData = storableToFormData(data);

        // Envío directo al backend
        await createVisitLog(formData);

        // Sincronizado correctamente -> eliminar de IndexedDB
        await removeFromQueue(item.id);
        syncedCount++;
      } catch (err) {
        const isNetworkError =
          !err.response ||
          err.code === "ECONNABORTED" ||
          err.message === "Network Error" ||
          err.message.includes("timeout") ||
          err.message.includes("Network");

        if (isNetworkError) {
          await updateQueueItem(item.id, { status: "PENDING", errorMessage: "Error de red / Sin conexión" });
          console.log(`⚠️ Sincronización en pausa (red) para item ${item.id}`);
        } else {
          const msg = err.response?.data?.message || err.message || "Error del servidor";
          await updateQueueItem(item.id, { status: "FAILED", errorMessage: msg });
          console.error(`❌ Falló la sincronización para item ${item.id}:`, msg);
        }

        // Detener bucle para mantener el orden cronológico
        break;
      }
    }

    await refreshQueue();

    // Invalidamos caches para actualizar UI
    queryClient.invalidateQueries(["activeVisit"]);
    queryClient.invalidateQueries(["visitLogs"]);
    queryClient.invalidateQueries(["myVisitLogs"]);

    if (syncedCount > 0) {
      toast({
        title: `${syncedCount} operación(es) sincronizada(s)`,
        description: "Se enviaron los registros de visita pendientes correctamente.",
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    }

    isSyncingRef.current = false;
    setIsSyncing(false);
  }, [toast, queryClient, refreshQueue]);

  const retryItem = useCallback(async (id) => {
    await updateQueueItem(id, { status: "PENDING", errorMessage: null });
    await refreshQueue();
    // Ejecutamos sincronización inmediatamente
    syncPending();
  }, [refreshQueue, syncPending]);

  const removeItem = useCallback(async (id) => {
    await removeFromQueue(id);
    await refreshQueue();
    queryClient.invalidateQueries(["activeVisit"]);
    queryClient.invalidateQueries(["visitLogs"]);
    queryClient.invalidateQueries(["myVisitLogs"]);
  }, [refreshQueue, queryClient]);

  useEffect(() => {
    refreshQueue();
    // Intentar sincronizar al iniciar
    syncPending();

    // Sincronizar cuando el dispositivo recupere conexión
    window.addEventListener("online", syncPending);

    // Intervalo de sincronización de 1 hora (3600000 ms) para optimizar rendimiento/batería
    const interval = setInterval(() => {
      syncPending();
    }, 3600000);

    return () => {
      window.removeEventListener("online", syncPending);
      clearInterval(interval);
    };
  }, [syncPending, refreshQueue]);

  return {
    pendingCount,
    queueItems,
    isSyncing,
    syncPending,
    retryItem,
    removeItem,
    refreshQueue,
  };
};