import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "../../../shared/lib/socket";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { checkIsAdmin } from "../../../shared/utils/permissions";
import { useToast } from "@chakra-ui/react";

export function useQuoteSocket() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const displayedToastIdsRef = useRef(new Set());

  useEffect(() => {
    if (!socket) return;

    // SAP puede emitir quote:created, quote:updated y varias notificaciones por
    // una sola operación. Se agrupan para evitar ráfagas de HTTP y renders.
    let refreshTimer = null;
    const pendingRefresh = {
      quotes: false,
      notifications: false,
      quoteDetails: false,
      highlightDocId: null,
    };
    const scheduleRefresh = ({ quotes = false, notifications = false, quoteDetails = false, highlightDocId = null } = {}) => {
      pendingRefresh.quotes ||= quotes;
      pendingRefresh.notifications ||= notifications;
      pendingRefresh.quoteDetails ||= quoteDetails;
      pendingRefresh.highlightDocId = highlightDocId || pendingRefresh.highlightDocId;
      if (refreshTimer) return;

      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        if (pendingRefresh.quotes) {
          queryClient.invalidateQueries({ queryKey: ["quotes"] });
          window.dispatchEvent(new Event("localQuotesUpdated"));
        }
        if (pendingRefresh.notifications) {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
          window.dispatchEvent(new Event("localNotificationsUpdated"));
        }
        if (pendingRefresh.quoteDetails) {
          queryClient.invalidateQueries({ queryKey: ["quoteById"] });
        }
        if (pendingRefresh.highlightDocId) {
          window.dispatchEvent(new CustomEvent("quoteHighlight", {
            detail: { docId: pendingRefresh.highlightDocId },
          }));
        }
        pendingRefresh.quotes = false;
        pendingRefresh.notifications = false;
        pendingRefresh.quoteDetails = false;
        pendingRefresh.highlightDocId = null;
      }, 100);
    };

    // 1. Escuchar cotizaciones creadas en vivo
    const handleQuoteCreated = (quote) => {
      const docId = quote?.docNumber || quote?.id;
      console.log("⚡ [WS EVENT] quote:created recibido:", docId);
      scheduleRefresh({ quotes: true, notifications: true, quoteDetails: true, highlightDocId: docId });
    };

    // 2. Escuchar cotizaciones actualizadas (aprobadas, rechazadas, etc.)
    const handleQuoteUpdated = (quote) => {
      const docId = quote?.docNumber || quote?.id;
      console.log("⚡ [WS EVENT] quote:updated recibido:", docId);
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

      scheduleRefresh({ quotes: true, notifications: true, quoteDetails: true, highlightDocId: docId });
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

      scheduleRefresh({ quotes: true, notifications: true, quoteDetails: true });
    };

    // 4. Escuchar notificaciones entrantes en vivo (tipo WhatsApp)
    const handleNewNotification = (notif) => {
      if (!notif) return;
      console.log("🔔 [WS EVENT] notification:new recibido:", notif.id || notif.title);

      const authState = useAuthStore.getState();
      const currentUsername = (authState.username || "").trim().toLowerCase();
      const currentRole = (authState.role || "").trim().toUpperCase();
      const currentEndpoints = authState.endpoints;
      const isAdminActive = currentRole === "ADMIN" || currentRole === "FACTURACION" || currentRole === "SUPERVISOR" || checkIsAdmin(currentEndpoints, authState.username);

      const targetRoleUpper = String(notif.targetRole || "").trim().toUpperCase();
      const targetUser = String(notif.targetUsername || "").trim().toLowerCase();

      let isForMe = false;

      if (isAdminActive) {
        // Facturación / Admin ONLY recibe cotizaciones pendientes de revisión/aprobación
        if (targetRoleUpper === "FACTURACION" || targetRoleUpper === "ADMIN") {
          const statusUpper = String(notif.status || "").trim().toUpperCase();
          const titleLower = String(notif.title || "").toLowerCase();
          if (statusUpper !== "EMITIDO" && statusUpper !== "ANULADO" && statusUpper !== "CANCELADO" && !titleLower.includes("orden sap") && !titleLower.includes("pedido emitido")) {
            isForMe = true;
          }
        }
      } else {
        // VENDEDOR: ONLY recibe notificaciones para su rol y dirigidas a su nombre de usuario
        if (targetRoleUpper === "VENDEDOR" || targetRoleUpper === "SELLER") {
          if (!targetUser || targetUser === currentUsername || currentUsername.includes(targetUser) || targetUser.includes(currentUsername)) {
            isForMe = true;
          }
        }
      }

      if (isForMe) {
        try {
          const raw = localStorage.getItem("grupoLeon_notifications");
          const all = raw ? JSON.parse(raw) : [];
          // Deduplicar: 1 sola alerta canónica por cotización
          const rawQ = String(notif.quoteId || notif.id || "").trim();
          const matchWeb = String(notif.title || "").match(/COT-WEB-(\d+)/i) || 
                           String(notif.title || "").match(/COT-(\d+)/i) ||
                           rawQ.match(/COT-WEB-(\d+)/i) || 
                           rawQ.match(/COT-(\d+)/i) || 
                           rawQ.match(/^(\d+)$/);
          const canonicalTarget = matchWeb ? `QUOTE-${Number(matchWeb[1])}` : rawQ;

          const remaining = all.filter(n => {
            const nQ = String(n.quoteId || n.id || "").trim();
            const nMatch = String(n.title || "").match(/COT-WEB-(\d+)/i) || 
                           String(n.title || "").match(/COT-(\d+)/i) ||
                           nQ.match(/COT-WEB-(\d+)/i) || 
                           nQ.match(/COT-(\d+)/i) || 
                           nQ.match(/^(\d+)$/);
            const nCanonical = nMatch ? `QUOTE-${Number(nMatch[1])}` : nQ;
            return nCanonical !== canonicalTarget;
          });

          localStorage.setItem("grupoLeon_notifications", JSON.stringify([notif, ...remaining]));
        } catch {}
      }

      scheduleRefresh({ notifications: true });

      // Si yo mismo envié la cotización, no necesito ver el toast de "Nueva cotización recibida"
      const isSender = notif.fromUsername && currentUsername && notif.fromUsername.toLowerCase() === currentUsername;
      if (isSender && notif.status === "ENVIADO") {
        return;
      }

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
          status: notif.status === "APROBADO_COMERCIAL" || notif.status === "APROBADO" ? "success" : notif.status === "RECHAZADO" ? "error" : "warning",
          duration: 7000,
          isClosable: true,
          position: "top-right",
          isCustom: true
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
      if (refreshTimer) window.clearTimeout(refreshTimer);
      socket.off("quote:created", handleQuoteCreated);
      socket.off("quote:updated", handleQuoteUpdated);
      socket.off("quote:deleted", handleQuoteDeleted);
      socket.off("notification:new", handleNewNotification);
      socket.off("user:permissions:updated", handlePermissionsUpdated);
      socket.off("system:update", handleSystemUpdate);
    };
  }, [queryClient, toast]);
}
