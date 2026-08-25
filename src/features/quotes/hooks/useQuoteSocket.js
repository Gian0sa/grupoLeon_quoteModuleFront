import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "../../../shared/lib/socket";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { useToast } from "@chakra-ui/react";

export function useQuoteSocket() {
  const queryClient = useQueryClient();
  const { username, role } = useAuthStore();
  const toast = useToast();

  useEffect(() => {
    if (!socket) return;

    // 1. Escuchar cotizaciones creadas en vivo
    const handleQuoteCreated = (quote) => {
      console.log("⚡ [WS EVENT] quote:created recibido:", quote);
      
      // Auto-generar notificación si la cotización fue ENVIADA
      if (quote && (quote.state === "ENVIADO" || quote.approvalStatus === "ENVIADO")) {
        const notifObj = {
          id: `NOTIF-${Date.now()}`,
          targetRole: "FACTURACION",
          targetUsername: "enrique",
          fromUsername: quote.sellerName || quote.createdByUsername || "Vendedor",
          quoteId: quote.docNumber || String(quote.id),
          quoteObj: quote,
          title: `📩 Nueva Cotización Recibida - ${quote.docNumber}`,
          description: `Enviada por ${quote.sellerName || "Vendedor"} • Cliente: ${quote.clientName} (${quote.totals?.grandTotalUSD ? `$${Number(quote.totals.grandTotalUSD).toFixed(2)}` : '$0.00'}). Requiere validación comercial.`,
          status: "ENVIADO",
          createdAt: new Date().toISOString(),
          timestamp: new Date().toISOString(),
          read: false
        };

        try {
          const raw = localStorage.getItem("grupoLeon_notifications");
          const all = raw ? JSON.parse(raw) : [];
          if (!all.some(n => n.quoteId === notifObj.quoteId && n.status === "ENVIADO")) {
            localStorage.setItem("grupoLeon_notifications", JSON.stringify([notifObj, ...all]));
          }
        } catch {}
      }

      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      window.dispatchEvent(new Event("localQuotesUpdated"));
      window.dispatchEvent(new Event("localNotificationsUpdated"));
    };

    // 2. Escuchar cotizaciones actualizadas (aprobadas, rechazadas, etc.)
    const handleQuoteUpdated = (quote) => {
      console.log("⚡ [WS EVENT] quote:updated recibido:", quote);
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
      console.log("🔔 [WS EVENT] notification:new recibido:", notif);
      
      try {
        const raw = localStorage.getItem("grupoLeon_notifications");
        const all = raw ? JSON.parse(raw) : [];
        if (!all.some(n => String(n.id) === String(notif.id) || (n.quoteId === notif.quoteId && n.status === notif.status))) {
          localStorage.setItem("grupoLeon_notifications", JSON.stringify([notif, ...all]));
        }
      } catch {}

      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      window.dispatchEvent(new Event("localNotificationsUpdated"));

      // Notificar con toast si coincide con el rol o usuario activo
      const isForMe =
        (notif.targetUsername && notif.targetUsername.toLowerCase() === username?.toLowerCase()) ||
        (notif.targetRole && notif.targetRole === role) ||
        (notif.targetRole === "FACTURACION" && (role === "ADMIN" || username?.toLowerCase() === "enrique"));

      if (isForMe && notif.title) {
        toast({
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

        toast({
          title: "🔑 Accesos y Permisos Actualizados",
          description: `Tus accesos han sido actualizados en tiempo real (${data.endpoints.length} permisos activos). No requieres cerrar sesión.`,
          status: "success",
          duration: 6000,
          isClosable: true,
          position: "top-right",
        });
      }

      // Refrescar consultas de usuarios y servicios en cualquier panel de administración abierto
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
      queryClient.invalidateQueries({ queryKey: ["allUsersAdmin"] });
      queryClient.invalidateQueries({ queryKey: ["Services"] });
    };

    socket.on("quote:created", handleQuoteCreated);
    socket.on("quote:updated", handleQuoteUpdated);
    socket.on("quote:deleted", handleQuoteDeleted);
    socket.on("notification:new", handleNewNotification);
    socket.on("user:permissions:updated", handlePermissionsUpdated);

    return () => {
      socket.off("quote:created", handleQuoteCreated);
      socket.off("quote:updated", handleQuoteUpdated);
      socket.off("quote:deleted", handleQuoteDeleted);
      socket.off("notification:new", handleNewNotification);
      socket.off("user:permissions:updated", handlePermissionsUpdated);
    };
  }, [queryClient, username, role, toast]);
}
