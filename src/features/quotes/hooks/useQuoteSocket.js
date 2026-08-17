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
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      window.dispatchEvent(new Event("localQuotesUpdated"));
      window.dispatchEvent(new Event("localNotificationsUpdated"));
    };

    // 3. Escuchar cotizaciones eliminadas
    const handleQuoteDeleted = (data) => {
      console.log("⚡ [WS EVENT] quote:deleted recibido:", data);
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

    socket.on("quote:created", handleQuoteCreated);
    socket.on("quote:updated", handleQuoteUpdated);
    socket.on("quote:deleted", handleQuoteDeleted);
    socket.on("notification:new", handleNewNotification);

    return () => {
      socket.off("quote:created", handleQuoteCreated);
      socket.off("quote:updated", handleQuoteUpdated);
      socket.off("quote:deleted", handleQuoteDeleted);
      socket.off("notification:new", handleNewNotification);
    };
  }, [queryClient, username, role, toast]);
}
