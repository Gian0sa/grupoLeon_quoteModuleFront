import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "../../../shared/lib/socket";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useToast } from "@chakra-ui/react";

export function useQuoteSocket() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const displayedToastIdsRef = useRef(new Set());

  useEffect(() => {
    if (!socket) return;

    // 1. Escuchar cotizaciones creadas en vivo
    const handleQuoteCreated = (quote) => {
      console.log("⚡ [WS EVENT] quote:created recibido:", quote?.docNumber || quote?.id);
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      window.dispatchEvent(new Event("localQuotesUpdated"));
      window.dispatchEvent(new Event("localNotificationsUpdated"));
    };

    // 2. Escuchar cotizaciones actualizadas (aprobadas, rechazadas, etc.)
    const handleQuoteUpdated = (quote) => {
      console.log("⚡ [WS EVENT] quote:updated recibido:", quote?.docNumber || quote?.id);
      if (quote && (quote.state === "ANULADO" || quote.approvalStatus === "ANULADO")) {
        const targetId = quote.docNumber || quote.id || quote.quoteId;
        const targetStr = String(targetId || "").trim().toUpperCase();
        if (targetStr) {
          try {
            const raw = localStorage.getItem("grupoLeon_notifications");
            const all = raw ? JSON.parse(raw) : [];
            const remaining = all.filter(n => {
              const notifQuoteId = String(n.quoteId || "").trim().toUpperCase();
              const notifId = String(n.id || "").trim().toUpperCase();
              return notifQuoteId !== targetStr && notifId !== targetStr;
            });
            localStorage.setItem("grupoLeon_notifications", JSON.stringify(remaining));
          } catch (err) {
            console.error("Error limpiando notificaciones anuladas:", err);
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      window.dispatchEvent(new Event("localQuotesUpdated"));
      window.dispatchEvent(new Event("localNotificationsUpdated"));
    };

    // 3. Escuchar cotizaciones eliminadas
    const handleQuoteDeleted = (data) => {
      console.log("⚡ [WS EVENT] quote:deleted recibido:", data);
      const targetId = typeof data === "object" ? (data.quoteId || data.docNumber || data.id) : data;
      const targetStr = String(targetId || "").trim().toUpperCase();

      if (targetStr) {
        try {
          const raw = localStorage.getItem("grupoLeon_notifications");
          const all = raw ? JSON.parse(raw) : [];
          const remaining = all.filter(n => {
            const notifQuoteId = String(n.quoteId || "").trim().toUpperCase();
            const notifId = String(n.id || "").trim().toUpperCase();
            return notifQuoteId !== targetStr && notifId !== targetStr;
          });
          localStorage.setItem("grupoLeon_notifications", JSON.stringify(remaining));
        } catch (err) {
          console.error("Error limpiando notificaciones eliminadas:", err);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      window.dispatchEvent(new Event("localQuotesUpdated"));
      window.dispatchEvent(new Event("localNotificationsUpdated"));
    };

    // 4. Escuchar notificaciones entrantes en vivo (tipo WhatsApp)
    const handleNewNotification = (notif) => {
      if (!notif) return;
      console.log("🔔 [WS EVENT] notification:new recibido:", notif.id || notif.title);
      
      try {
        const raw = localStorage.getItem("grupoLeon_notifications");
        const all = raw ? JSON.parse(raw) : [];
        if (!all.some(n => String(n.id) === String(notif.id) || (n.quoteId === notif.quoteId && n.status === notif.status))) {
          localStorage.setItem("grupoLeon_notifications", JSON.stringify([notif, ...all]));
        }
      } catch {}

      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      window.dispatchEvent(new Event("localNotificationsUpdated"));

      const authState = useAuthStore.getState();
      const currentUsername = authState.username;
      const currentRole = authState.role;

      // Si yo mismo envié la cotización, no necesito ver el toast de "Nueva cotización recibida" (ya vi el toast de confirmación local)
      const isSender = notif.fromUsername && currentUsername && notif.fromUsername.toLowerCase() === currentUsername.toLowerCase();
      if (isSender && notif.status === "ENVIADO") {
        return;
      }

      // Notificar con toast si coincide con el rol o usuario activo
      const isForMe =
        (notif.targetUsername && notif.targetUsername.toLowerCase() === currentUsername?.toLowerCase()) ||
        (notif.targetRole && notif.targetRole === currentRole) ||
        (notif.targetRole === "FACTURACION" && (currentRole === "ADMIN" || currentUsername?.toLowerCase() === "enrique"));

      if (isForMe && notif.title) {
        const toastId = `ws-notif-${notif.quoteId || notif.id}-${notif.status || 'new'}`;
        
        // Blindaje contra toasts duplicados o repetidos
        if (displayedToastIdsRef.current.has(toastId) || toast.isActive(toastId)) {
          return;
        }

        displayedToastIdsRef.current.add(toastId);
        setTimeout(() => {
          displayedToastIdsRef.current.delete(toastId);
        }, 15000);

        toast({
          id: toastId,
          title: notif.title,
          description: notif.description || "Tienes una nueva actualización en el módulo de cotizaciones.",
          status: notif.status === "APROBADO_COMERCIAL" || notif.status === "APROBADO" ? "success" : notif.status === "RECHAZADO" ? "error" : "info",
          duration: 6000,
          isClosable: true,
          position: "top-right",
        });
      }
    };

    // 5. Escuchar actualización de permisos en tiempo real a nivel de usuario
    const handlePermissionsUpdated = (data) => {
      console.log("⚡ [WS EVENT] user:permissions:updated recibido:", data);
      const activeUserId = useAuthStore.getState().userId;
      const activeUsername = useAuthStore.getState().username;

      const isTargetUser =
        (data.userId && String(data.userId) === String(activeUserId)) ||
        (data.username && activeUsername && data.username.toLowerCase() === activeUsername.toLowerCase());

      if (isTargetUser && Array.isArray(data.endpoints)) {
        console.log("🔑 [WS PERMISSIONS] Aplicando nuevos permisos en vivo al usuario actual:", data.endpoints);
        useAuthStore.getState().updateEndpoints(data.endpoints);
        window.dispatchEvent(new Event("permissionsUpdated"));

        const toastId = `ws-perm-${Date.now()}`;
        if (!toast.isActive(toastId)) {
          toast({
            id: toastId,
            title: "🔑 Accesos y Permisos Actualizados",
            description: `Tus accesos han sido actualizados en tiempo real (${data.endpoints.length} permisos activos). No requieres cerrar sesión.`,
            status: "success",
            duration: 6000,
            isClosable: true,
            position: "top-right",
          });
        }
      }

      // Refrescar consultas de usuarios y servicios en cualquier panel de administración abierto
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["allUsersAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["Services"] });
    };

    // 6. Escuchar actualizaciones en vivo del sistema o avisos globales de mantenimiento
    const handleSystemUpdate = (data) => {
      console.log("⚡ [WS EVENT] system:update recibido:", data);
      const toastId = `ws-sys-${data?.id || Date.now()}`;
      if (!toast.isActive(toastId)) {
        toast({
          id: toastId,
          title: data?.title || "🚀 Nueva Actualización del Sistema",
          description: data?.message || "Se han aplicado mejoras en el sistema. Puedes seguir trabajando con total normalidad.",
          status: data?.type || "info",
          duration: 9000,
          isClosable: true,
          position: "top-right",
        });
      }
    };

    socket.on("quote:created", handleQuoteCreated);
    socket.on("quote:updated", handleQuoteUpdated);
    socket.on("quote:deleted", handleQuoteDeleted);
    socket.on("notification:new", handleNewNotification);
    socket.on("user:permissions:updated", handlePermissionsUpdated);
    socket.on("system:update", handleSystemUpdate);

    return () => {
      socket.off("quote:created", handleQuoteCreated);
      socket.off("quote:updated", handleQuoteUpdated);
      socket.off("quote:deleted", handleQuoteDeleted);
      socket.off("notification:new", handleNewNotification);
      socket.off("user:permissions:updated", handlePermissionsUpdated);
      socket.off("system:update", handleSystemUpdate);
    };
  }, [queryClient, toast]);
}

