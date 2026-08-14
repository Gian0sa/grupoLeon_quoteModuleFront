import { useEffect, useCallback, useState, useRef } from "react";
import { useToast } from "@chakra-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getQueue,
  removeFromQueue,
  clearAllQueue,
  getQueueCount,
  updateQueueItem,
  QUEUE_STATUS,
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
    if (!enabledRef.current) return;

    // Se activa antes del primer await: si el montaje, el evento "online" y el
    // visibilitychange disparan syncPending() casi al mismo tiempo (típico al
    // reabrir la app justo cuando vuelve la señal), solo la primera llamada debe
    // pasar de aquí en adelante. Activarlo después del await dejaba una ventana
    // donde las tres pasaban el candado y triplicaban el envío del mismo ítem.
    isSyncingRef.current = true;

    const items = await getQueue();
    if (items.length === 0) {
      setPendingCount(0);
      setQueueItems([]);
      isSyncingRef.current = false;
      return;
    }

    setIsSyncing(true);
    console.log(`🔄 Sincronizando ${items.length} check-in(s)/out(s) pendientes...`);
    let syncedCount = 0;

    // Purga de items viejos con estado SYNCED (más de 2 días).
    // Solo se borra lo ya confirmado por el servidor: nunca lo pendiente ni lo
    // que espera revisión.
    const TWO_DAYS = 48 * 60 * 60 * 1000;
    const STUCK_SYNCING = 5 * 60 * 1000;
    const now = Date.now();
    for (const item of items) {
      if (item.status === QUEUE_STATUS.SYNCED && (now - (item._queuedAt || 0)) > TWO_DAYS) {
        await removeFromQueue(item.id);
        continue;
      }
      // Si la app se cerró a mitad del envío, el ítem quedaba en SYNCING para
      // siempre y nunca se reintentaba. Se rescata a PENDING.
      if (
        item.status === QUEUE_STATUS.SYNCING &&
        now - (item._syncStartedAt || item._queuedAt || 0) > STUCK_SYNCING
      ) {
        await updateQueueItem(item.id, {
          status: QUEUE_STATUS.PENDING,
          errorMessage: "Envío interrumpido, se reintentará",
        });
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

    // Orden cronológico por ID (equivale al orden en que el vendedor marcó)
    const sortedQueue = currentItems.sort((a, b) => a.id - b.id);

    // Filtrar items listos para enviar respetando dependencias (IN antes que su OUT)
    const itemsToProcess = [];
    for (const item of sortedQueue) {
      if (item.status === QUEUE_STATUS.SYNCED) continue;

      // Los que esperan conciliación no se reintentan solos: reenviarlos sin
      // cambios volvería a fallar. Solo salen de aquí por acción manual
      // (retryItem), que los devuelve a PENDING.
      if (item.status === QUEUE_STATUS.NEEDS_REVIEW) continue;

      if (item.type === "OUT") {
        // Emparejamiento por grupo; se mantiene el criterio por tienda para
        // ítems encolados por versiones anteriores de la app.
        const matchingIn = sortedQueue.find(
          (i) =>
            i.type === "IN" &&
            i.id < item.id &&
            (item.visitGroupId
              ? i.visitGroupId === item.visitGroupId
              : i.storeName === item.storeName)
        );

        // Si su Check-In quedó esperando revisión, el Check-Out corre la misma
        // suerte: se conservan juntos para conciliar el par completo.
        if (matchingIn && matchingIn.status === QUEUE_STATUS.NEEDS_REVIEW) {
          await updateQueueItem(item.id, {
            status: QUEUE_STATUS.NEEDS_REVIEW,
            errorMessage: "Su Check-In requiere revisión; el par se concilia junto.",
          });
          continue;
        }

        // Si el Check-In aún no viajó y tampoco entra en esta tanda, se posterga.
        if (
          matchingIn &&
          matchingIn.status !== QUEUE_STATUS.SYNCED &&
          !itemsToProcess.some((i) => i.id === matchingIn.id)
        ) {
          console.warn(`⏳ Postergando Check-Out de "${item.storeName}": su Check-In aún no se sincroniza.`);
          await updateQueueItem(item.id, {
            status: QUEUE_STATUS.PENDING,
            errorMessage: "Esperando sincronización previa de Check-In",
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
            await updateQueueItem(item.id, { status: QUEUE_STATUS.SYNCED, errorMessage: null });
            syncedCount++;
          } else {
            const failure = failedUuids.find((f) => f.uuid === item.uuid);
            const msg = failure?.reason || "No se pudo sincronizar el registro";
            // El servidor indica si el fallo es transitorio. Ante la duda
            // (respuesta de una versión anterior sin el campo) se reintenta,
            // porque descartar una visita es peor que reintentarla de más.
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
        // Sin respuesta, timeout, 401/403 (sesión expirada) y 5xx son
        // transitorios: se reintentan. Antes cualquier error CON respuesta
        // marcaba FAILED, y un 401 durante la sincronización dejaba el
        // Check-In atascado para siempre.
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

    queryClient.invalidateQueries(["activeVisit"]);
    queryClient.invalidateQueries(["visitLogs"]);
    queryClient.invalidateQueries(["myVisitLogs"]);

    if (syncedCount > 0 && enabledRef.current) {
      const SYNC_SUCCESS_TOAST_ID = "sync-queue-success-toast";
      if (!toast.isActive(SYNC_SUCCESS_TOAST_ID)) {
        toast({
          id: SYNC_SUCCESS_TOAST_ID,
          title: `${syncedCount} marca(s) sincronizada(s)`,
          description: "Se enviaron los registros de visita pendientes correctamente al servidor.",
          status: "success",
          duration: 4000,
          isClosable: true,
          position: "top",
        });
      } else {
        toast.update(SYNC_SUCCESS_TOAST_ID, {
          title: `${syncedCount} marca(s) sincronizada(s)`,
          description: "Se enviaron los registros de visita pendientes correctamente al servidor.",
        });
      }
    }

    isSyncingRef.current = false;
    setIsSyncing(false);
  }, [toast, queryClient, refreshQueue]);

  const retryItem = useCallback(async (id) => {
    await updateQueueItem(id, { status: QUEUE_STATUS.PENDING, errorMessage: null });
    await refreshQueue();
    syncPending();
  }, [refreshQueue, syncPending]);

  const retryGroup = useCallback(async (inId, outId) => {
    if (inId) await updateQueueItem(inId, { status: QUEUE_STATUS.PENDING, errorMessage: null });
    if (outId) await updateQueueItem(outId, { status: QUEUE_STATUS.PENDING, errorMessage: null });
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

  const clearAll = useCallback(async () => {
    await clearAllQueue();
    await refreshQueue();
    queryClient.invalidateQueries(["activeVisit"]);
    queryClient.invalidateQueries(["visitLogs"]);
    queryClient.invalidateQueries(["myVisitLogs"]);
  }, [refreshQueue, queryClient]);

  useEffect(() => {
    // El conteo se refresca siempre (la UI puede querer mostrar pendientes),
    // pero solo se intenta enviar cuando hay sesión.
    refreshQueue();
    if (!enabled) return undefined;

    syncPending();
    window.addEventListener("online", syncPending);

    const interval = setInterval(() => {
      syncPending();
    }, 3600000);

    return () => {
      window.removeEventListener("online", syncPending);
      clearInterval(interval);
    };
  }, [enabled, syncPending, refreshQueue]);

  return {
    pendingCount,
    queueItems,
    isSyncing,
    syncPending,
    retryItem,
    retryGroup,
    removeItem,
    clearAll,
    refreshQueue,
  };
};