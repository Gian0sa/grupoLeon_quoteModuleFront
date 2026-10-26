import { useEffect, useCallback, useState, useRef } from "react";
import { useToast } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getQueue,
  removeFromQueue,
  clearAllQueue,
  updateQueueItem,
  QUEUE_STATUS,
  isUnsynced,
} from "../services/visitLogQueue";
import { createBulkVisitLogs } from "../services/visitLogService";

export const useSyncQueue = ({ enabled = true } = {}) => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [pendingCount, setPendingCount] = useState(0);
  const [queueItems, setQueueItems] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);

  const isSyncingRef = useRef(false);
  // Se lee dentro de syncPending para no recrear la función en cada cambio.
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const refreshQueue = useCallback(async () => {
    try {
      const items = await getQueue();
      const sortedItems = (items || []).sort((a, b) => a.id - b.id);
      setPendingCount(sortedItems.filter(isUnsynced).length);
      setQueueItems(sortedItems);
    } catch (error) {
      // Ignorar silenciosamente si el navegador bloquea el almacenamiento local
    }
  }, []);

  const syncPending = useCallback(async (forceAll = false) => {
    if (isSyncingRef.current) return;
    if (!enabledRef.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      return;
    }

    isSyncingRef.current = true;
    try {
      const items = await getQueue();

      if (!items || items.length === 0) {
        setPendingCount(0);
        setQueueItems([]);
        return;
      }

      let syncedCount = 0;

      // Limpieza inmediata de items ya sincronizados y recuperación de bloqueos en SYNCING
      const STUCK_SYNCING = 30 * 1000;
      const now = Date.now();
      for (const item of items) {
        if (item.status === QUEUE_STATUS.SYNCED) {
          await removeFromQueue(item.id);
          continue;
        }
        if (
          item.status === QUEUE_STATUS.SYNCING &&
          now - (item._syncStartedAt || item._queuedAt || 0) > STUCK_SYNCING
        ) {
          await updateQueueItem(item.id, {
            status: QUEUE_STATUS.PENDING,
            errorMessage: null,
          });
        }
      }

      const currentItems = await getQueue();
      if (!currentItems || currentItems.length === 0) {
        setPendingCount(0);
        setQueueItems([]);
        return;
      }

      // Orden cronológico por ID (equivale al orden en que el vendedor marcó)
      const sortedQueue = currentItems.sort((a, b) => a.id - b.id);

      // Filtrar items listos para enviar respetando dependencias (IN antes que su OUT)
      const itemsToProcess = [];
      for (const item of sortedQueue) {
        if (item.status === QUEUE_STATUS.SYNCED) {
          await removeFromQueue(item.id);
          continue;
        }
        if (item.status === QUEUE_STATUS.SYNCING) continue;

        // Si no se fuerza sincronización total, omitir items marcados para revisión
        if (item.status === QUEUE_STATUS.NEEDS_REVIEW && !forceAll) continue;

        if (item.type === "OUT") {
          const matchingIn = sortedQueue.find(
            (i) =>
              i.type === "IN" &&
              i.id < item.id &&
              (item.visitGroupId
                ? i.visitGroupId === item.visitGroupId
                : i.storeName === item.storeName)
          );

          // Si el Check-In aún no viajó y tampoco entra en esta tanda, se posterga
          if (
            matchingIn &&
            matchingIn.status !== QUEUE_STATUS.SYNCED &&
            !itemsToProcess.some((i) => i.id === matchingIn.id)
          ) {
            console.warn(`⏳ Postergando Check-Out de "${item.storeName}": esperando Check-In.`);
            await updateQueueItem(item.id, {
              status: QUEUE_STATUS.PENDING,
              errorMessage: "Esperando sincronización previa de Check-In",
            });
            continue;
          }
        }

        itemsToProcess.push(item);
      }

      if (itemsToProcess.length === 0) {
        await refreshQueue();
        return;
      }

      setIsSyncing(true);
      console.log(`🔄 Sincronizando ${itemsToProcess.length} check-in(s)/out(s) pendientes...`);
      const configuredBatchSize = Number.parseInt(import.meta.env.VITE_SYNC_BATCH_SIZE, 10);
      const batchSize = Number.isFinite(configuredBatchSize)
        ? Math.min(100, Math.max(1, configuredBatchSize))
        : 30;

      for (let i = 0; i < itemsToProcess.length; i += batchSize) {
        const batch = itemsToProcess.slice(i, i + batchSize);
        const batchFormData = new FormData();
        const logsArray = [];

        for (const item of batch) {
          await updateQueueItem(item.id, {
            status: QUEUE_STATUS.SYNCING,
            _syncStartedAt: Date.now(),
          });

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
              // Sincronizado exitosamente en el servidor -> eliminar de la cola local inmediatamente
              await removeFromQueue(item.id);
              syncedCount++;
            } else {
              const failure = failedUuids.find((f) => f.uuid === item.uuid);
              const msg = failure?.reason || "No se pudo sincronizar el registro";

              // Si es un Check-Out rechazado con "sin un Check-In previo", significa que la visita
              // ya fue cerrada o no requiere Check-In previo en el servidor.
              if (item.type === "OUT" && msg.includes("sin un Check-In previo")) {
                console.log(`ℹ️ Check-Out ${item.id} conciliado con el servidor. Eliminando de cola.`);
                await removeFromQueue(item.id);
                syncedCount++;
                continue;
              }

              // Si es un Check-In rechazado porque ya existe un Check-In activo o colisión de UUID,
              // conciliar con el servidor para no dejar la cola trabada indefinidamente.
              if (item.type === "IN" && (msg.includes("Ya tienes un Check-In activo") || msg.includes("ya registrado") || msg.includes("VisitLog_uuid_key"))) {
                console.log(`ℹ️ Check-In ${item.id} conciliado con el servidor. Eliminando de cola.`);
                await removeFromQueue(item.id);
                syncedCount++;
                continue;
              }

              const retryable = failure?.retryable !== false;
              await updateQueueItem(item.id, {
                status: retryable ? QUEUE_STATUS.PENDING : QUEUE_STATUS.NEEDS_REVIEW,
                errorMessage: msg,
              });
              console.error(`❌ Item ${item.id} no sincronizado (retryable=${retryable}):`, msg);
            }
          }
        } catch (err) {
          const status = err.response?.status;
          const isTransient =
            !err.response ||
            err.code === "ECONNABORTED" ||
            /Network|timeout/i.test(err.message || "") ||
            status === 401 ||
            status === 403 ||
            status === 408 ||
            status === 429 ||
            status >= 500;

          const msg = err.response?.data?.message || err.message || "Error del servidor";

          for (const item of batch) {
            await updateQueueItem(item.id, {
              status: isTransient ? QUEUE_STATUS.PENDING : QUEUE_STATUS.NEEDS_REVIEW,
              errorMessage: isTransient ? "Sin conexión o sesión expirada. Se reintentará." : msg,
            });
          }

          if (isTransient) break;
        }
      }

      await refreshQueue();

      if (syncedCount > 0) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["activeVisit"] }),
          queryClient.invalidateQueries({ queryKey: ["visitLogs"] }),
          queryClient.invalidateQueries({ queryKey: ["myVisitLogs"] }),
        ]);
      }

      if (syncedCount > 0 && enabledRef.current) {
        if (toast.isActive("sync-queue-success-toast")) {
          toast.close("sync-queue-success-toast");
        }
        toast({
          title: `${syncedCount} marca(s) sincronizada(s)`,
          description: "Se enviaron los registros de visita pendientes correctamente al servidor.",
          status: "success",
          duration: 3500,
          isClosable: true,
          position: "top",
        });
      }

      // Si quedaron ítems postergados que ahora pueden enviarse, encadenar pasada adicional SOLO si hubo éxito previo
      if (syncedCount > 0) {
        const remainingItems = await getQueue();
        if (remainingItems.some((i) => i.status === QUEUE_STATUS.PENDING)) {
          setTimeout(() => {
            syncPending().catch(() => {});
          }, 1000);
        }
      }
    } catch (error) {
      console.warn("⚠️ No se pudo procesar la cola offline; se reintentará:", error?.message || error);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [toast, queryClient, refreshQueue]);

  const onSyncAll = useCallback(async () => {
    try {
      const current = await getQueue();
      for (const it of current) {
        if (it.status === QUEUE_STATUS.NEEDS_REVIEW || it.status === "FAILED") {
          await updateQueueItem(it.id, { status: QUEUE_STATUS.PENDING, errorMessage: null });
        }
      }
      await refreshQueue();
      await syncPending(true);
    } catch (e) {
      console.error("Error en onSyncAll:", e);
    }
  }, [refreshQueue, syncPending]);

  const retryItem = useCallback(async (id) => {
    await updateQueueItem(id, { status: QUEUE_STATUS.PENDING, errorMessage: null });
    await refreshQueue();
    syncPending(true);
  }, [refreshQueue, syncPending]);

  const retryGroup = useCallback(async (inId, outId) => {
    if (inId) await updateQueueItem(inId, { status: QUEUE_STATUS.PENDING, errorMessage: null });
    if (outId) await updateQueueItem(outId, { status: QUEUE_STATUS.PENDING, errorMessage: null });
    await refreshQueue();
    syncPending(true);
  }, [refreshQueue, syncPending]);

  const removeItem = useCallback(async (id) => {
    await removeFromQueue(id);
    await refreshQueue();
    queryClient.invalidateQueries({ queryKey: ["activeVisit"] });
    queryClient.invalidateQueries({ queryKey: ["visitLogs"] });
    queryClient.invalidateQueries({ queryKey: ["myVisitLogs"] });
  }, [refreshQueue, queryClient]);

  const clearAll = useCallback(async () => {
    await clearAllQueue();
    await refreshQueue();
    queryClient.invalidateQueries({ queryKey: ["activeVisit"] });
    queryClient.invalidateQueries({ queryKey: ["visitLogs"] });
    queryClient.invalidateQueries({ queryKey: ["myVisitLogs"] });
  }, [refreshQueue, queryClient]);

  useEffect(() => {
    if (toast.isActive("sync-queue-success-toast")) {
      toast.close("sync-queue-success-toast");
    }
    refreshQueue().catch(() => {});
    if (!enabled) return undefined;

    syncPending().catch(() => {});
    const onOnline = () => {
      syncPending().catch(() => {});
    };
    window.addEventListener("online", onOnline);

    const interval = setInterval(() => {
      syncPending().catch(() => {});
    }, 3600000);

    return () => {
      window.removeEventListener("online", onOnline);
      clearInterval(interval);
    };
  }, [enabled, syncPending, refreshQueue]);

  return {
    pendingCount,
    queueItems,
    isSyncing,
    syncPending,
    onSyncAll,
    retryItem,
    retryGroup,
    removeItem,
    clearAll,
    refreshQueue,
  };
};
