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
import { createVisitLog, createBulkVisitLogs } from "../services/visitLogService";

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

    // Purga de items viejos con estado SYNCED (más de 2 días)
    const TWO_DAYS = 48 * 60 * 60 * 1000;
    const now = Date.now();
    for (const item of items) {
      if (item.status === "SYNCED" && (now - (item._queuedAt || 0)) > TWO_DAYS) {
        await removeFromQueue(item.id);
      }
    }

    // Refrescar lista después de purgar
    const currentItems = await getQueue();
    if (currentItems.length === 0) {
      setPendingCount(0);
      setQueueItems([]);
      isSyncingRef.current = false;
      return;
    }

    // Orden cronológico por ID
    const sortedQueue = currentItems.sort((a, b) => a.id - b.id);
    const batchSize = parseInt(import.meta.env.VITE_SYNC_BATCH_SIZE) || 30;

    for (let i = 0; i < sortedQueue.length; i += batchSize) {
      const batch = sortedQueue.slice(i, i + batchSize);
      const batchFormData = new FormData();
      const logsArray = [];

      for (const item of batch) {
        if (item.status === "SYNCED") continue;

        await updateQueueItem(item.id, { status: "SYNCING" });

        const { id, _queuedAt, status, errorMessage, ...data } = item;

        // Separar imagen del objeto principal para mandarla como archivo
        if (data.image && data.image.__type === "File") {
          const file = new File([data.image.blob], data.image.name, { type: data.image.mime });
          batchFormData.append(`image_${data.uuid}`, file);
          delete data.image; 
        }

        logsArray.push(data);
      }

      if (logsArray.length === 0) continue;

      batchFormData.append("logs", JSON.stringify(logsArray));

      try {
        // Envío en bloque al backend
        const response = await createBulkVisitLogs(batchFormData);
        const { syncedUuids = [], failedUuids = [] } = response;

        for (const item of batch) {
          if (item.status === "SYNCED") continue;
          
          if (syncedUuids.includes(item.uuid)) {
            await updateQueueItem(item.id, { status: "SYNCED", errorMessage: null });
            syncedCount++;
          } else {
            const failure = failedUuids.find(f => f.uuid === item.uuid);
            const msg = failure?.reason || "No se pudo sincronizar el registro";
            await updateQueueItem(item.id, { status: "FAILED", errorMessage: msg });
            console.error(`❌ Falló la sincronización para item ${item.id}:`, msg);
          }
        }
      } catch (err) {
        const isNetworkError =
          !err.response ||
          err.code === "ECONNABORTED" ||
          err.message === "Network Error" ||
          err.message.includes("timeout") ||
          err.message.includes("Network");

        const msg = err.response?.data?.message || err.message || "Error del servidor";

        for (const item of batch) {
          if (item.status === "SYNCED") continue;

          if (isNetworkError) {
            await updateQueueItem(item.id, { status: "PENDING", errorMessage: "Error de red / Sin conexión" });
            console.log(`⚠️ Sincronización en pausa (red) para item ${item.id}`);
          } else {
            await updateQueueItem(item.id, { status: "FAILED", errorMessage: msg });
            console.error(`❌ Falló la sincronización para item ${item.id}:`, msg);
          }
        }

        if (isNetworkError) break;
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