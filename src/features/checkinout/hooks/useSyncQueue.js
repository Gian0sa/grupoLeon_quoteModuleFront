import { useEffect, useCallback, useState } from "react";
import { useToast } from "@chakra-ui/react";
import {
  getQueue,
  removeFromQueue,
  storableToFormData,
  getQueueCount,
} from "../services/visitLogQueue";
import { createVisitLog } from "../services/visitLogService";

export const useSyncQueue = () => {
  const toast = useToast();
  const [pendingCount, setPendingCount] = useState(0);

  // Refresca el contador de pendientes
  const refreshCount = useCallback(async () => {
    const count = await getQueueCount();
    setPendingCount(count);
  }, []);

  const syncPending = useCallback(async () => {
    const queue = await getQueue();
    if (queue.length === 0) return;

    console.log(`🔄 Sincronizando ${queue.length} check-in(s) pendientes...`);
    let synced = 0;

    for (const item of queue) {
      try {
        const { id, _queuedAt, ...data } = item;
        const formData = storableToFormData(data);
        await createVisitLog(formData);
        await removeFromQueue(id);
        synced++;
      } catch (err) {
        console.error("❌ Fallo al sincronizar item:", err);
        // Si falla uno, sigue intentando los demás
      }
    }

    await refreshCount();

    if (synced > 0) {
      toast({
        title: `${synced} check-in(s) sincronizados`,
        description: "Se enviaron los registros que estaban pendientes.",
        status: "success",
        duration: 4000,
        isClosable: true,
        position: "top",
      });
    }
  }, [toast, refreshCount]);

  useEffect(() => {
    refreshCount();
    syncPending();

    window.addEventListener("online", syncPending);
    return () => window.removeEventListener("online", syncPending);
  }, [syncPending, refreshCount]);

  return { pendingCount, syncPending };
};