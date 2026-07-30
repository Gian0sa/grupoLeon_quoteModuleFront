import { useEffect, useCallback, useState, useRef } from "react";
import { useToast } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getQueue,
  removeFromQueue,
  getQueueCount,
  updateQueueItem,
} from "../services/visitLogQueue";
import { createBulkVisitLogs } from "../services/visitLogService";

export const useSyncQueue = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [queueItems, setQueueItems] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const isSyncingRef = useRef(false);

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

    const currentItems = await getQueue();
    if (currentItems.length === 0) {
      setPendingCount(0);
      setQueueItems([]);
      isSyncingRef.current = false;
      setIsSyncing(false);
      return;
    }

    // Orden cronológico por ID
    const sortedQueue = currentItems.sort((a, b) => a.id - b.id);
    const syncedUuidsSet = new Set(
      sortedQueue.filter((item) => item.status === "SYNCED").map((i) => i.uuid)
    );

    // Filtrar items listos para enviar respetando dependencias (IN debe sincronizarse antes que OUT)
    const itemsToProcess = [];
    for (const item of sortedQueue) {
      if (item.status === "SYNCED") continue;

      if (item.type === "OUT") {
        // Buscar el Check-In correspondiente en la cola
        const matchingIn = sortedQueue.find(
          (i) => i.type === "IN" && i.storeName === item.storeName && i.id < item.id
        );

        // Si existe un Check-In local que aún NO ha sido sincronizado ni está en itemsToProcess, postergar el OUT
        if (matchingIn && matchingIn.status !== "SYNCED" && !itemsToProcess.some((i) => i.id === matchingIn.id)) {
          console.warn(`⏳ Postergando Check-Out para "${item.storeName}" porque su Check-In aún no se ha sincronizado.`);
          await updateQueueItem(item.id, { 
            status: "PENDING", 
            errorMessage: "Esperando sincronización previa de Check-In" 
          });
          continue;
        }
      }

      itemsToProcess.push(item);
    }

    const batchSize = parseInt(import.meta.env.VITE_SYNC_BATCH_SIZE) || 30;

    for (let i = 0; i < itemsToProcess.length; i += batchSize) {
      const batch = itemsToProcess.slice(i, i + batchSize);
      const batchFormData = new FormData();
      const logsArray = [];

      for (const item of batch) {
        await updateQueueItem(item.id, { status: "SYNCING" });

        const { id, _queuedAt, status, errorMessage, ...data } = item;

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
        const response = await createBulkVisitLogs(batchFormData);
        const { syncedUuids = [], failedUuids = [] } = response;

        for (const item of batch) {
          if (syncedUuids.includes(item.uuid)) {
            await updateQueueItem(item.id, { status: "SYNCED", errorMessage: null });
            syncedCount++;
          } else {
            const failure = failedUuids.find((f) => f.uuid === item.uuid);
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
          if (isNetworkError) {
            await updateQueueItem(item.id, { status: "PENDING", errorMessage: "Error de red / Sin conexión" });
          } else {
            await updateQueueItem(item.id, { status: "FAILED", errorMessage: msg });
          }
        }

        if (isNetworkError) break;
      }
    }

    await refreshQueue();

    queryClient.invalidateQueries(["activeVisit"]);
    queryClient.invalidateQueries(["visitLogs"]);
    queryClient.invalidateQueries(["myVisitLogs"]);

    if (syncedCount > 0) {
      toast({
        title: `${syncedCount} marca(s) sincronizada(s)`,
        description: "Se enviaron los registros de visita pendientes correctamente al servidor.",
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
    syncPending();
  }, [refreshQueue, syncPending]);

  const retryGroup = useCallback(async (inId, outId) => {
    if (inId) await updateQueueItem(inId, { status: "PENDING", errorMessage: null });
    if (outId) await updateQueueItem(outId, { status: "PENDING", errorMessage: null });
    await refreshQueue();
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
    syncPending();

    window.addEventListener("online", syncPending);

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
    retryGroup,
    removeItem,
    refreshQueue,
  };
};