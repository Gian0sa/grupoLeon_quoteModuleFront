import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "../../../shared/lib/socket";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { checkIsAdmin } from "../../../shared/utils/permissions";
import { useToast } from "@chakra-ui/react";
import { showLocalNativeNotification, subscribeToPush } from "../../../shared/services/pushNotificationService";

export function useQuoteSocket() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const displayedToastIdsRef = useRef(new Set());
  const lastPermissionProcessedAtRef = useRef(0);

  useEffect(() => {
    if (!socket) return;

    // 🔔 Solicitar permiso nativo al navegador (con soporte para User Gesture en HTTPS)
    const handleNativePermission = () => {
      if (typeof window !== "undefined" && "Notification" in window) {
        if (Notification.permission === "default") {
          Notification.requestPermission()
            .then((perm) => {
              if (perm === "granted") {
                subscribeToPush().catch(() => {});
              }
            })
            .catch(() => {});
        } else if (Notification.permission === "granted") {
          const alreadyRegistered = localStorage.getItem("grupoLeon_push_enabled") === "true";
          if (!alreadyRegistered) {
            subscribeToPush().catch(() => {});
          }
        }
      }
    };

    handleNativePermission();
    window.addEventListener("click", handleNativePermission, { once: true });
    window.addEventListener("touchend", handleNativePermission, { once: true });

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
      const isAdminActive =
        currentRole === "ADMIN" ||
        currentRole === "ADMINISTRADOR" ||
        currentRole.startsWith("ADMIN") ||
        currentRole === "FACTURACION" ||
        currentRole === "SUPERVISOR" ||
        currentRole.includes("DIGIT") ||
        currentRole.includes("SUPERVIS") ||
        currentRole.includes("CREDIT") ||
        currentRole.includes("COBRAN") ||
        currentRole.includes("GERENC") ||
        currentRole.includes("SISTEMA") ||
        currentRole.includes("JEFE") ||
        checkIsAdmin(currentEndpoints, authState.username);

      const targetRoleUpper = String(notif.targetRole || "").trim().toUpperCase();
      const targetUser = String(notif.targetUsername || "").trim().toLowerCase();

      let isForMe = false;

      if (isAdminActive) {
        // Facturación / Admin / Digitador ONLY recibe cotizaciones pendientes de revisión/aprobación
        if (
          targetRoleUpper === "FACTURACION" ||
          targetRoleUpper === "ADMIN" ||
          targetRoleUpper === "ADMINISTRADOR" ||
          targetRoleUpper.startsWith("ADMIN") ||
          targetRoleUpper.includes("DIGIT") ||
          targetRoleUpper.includes("SUPERVIS")
        ) {
          const statusUpper = String(notif.status || "").trim().toUpperCase();
          const titleLower = String(notif.title || "").toLowerCase();
          if (
            statusUpper !== "EMITIDO" &&
            statusUpper !== "ANULADO" &&
            statusUpper !== "CANCELADO" &&
            !titleLower.includes("orden sap") &&
            !titleLower.includes("pedido emitido") &&
            !titleLower.includes("orden de venta") &&
            !titleLower.includes("orden emitida")
          ) {
            isForMe = true;
          }
        }
      } else {
        // VENDEDOR: ONLY recibe notificaciones para su rol y dirigidas a su nombre de usuario
        if (targetRoleUpper === "VENDEDOR" || targetRoleUpper === "SELLER" || targetRoleUpper === "ASESOR_VENTAS") {
          const cleanTarget = targetUser.replace(/^\d+[\.\s-]+/, "").trim();
          const cleanCurrent = currentUsername.replace(/^\d+[\.\s-]+/, "").trim();
          if (
            !targetUser ||
            targetUser === currentUsername ||
            (cleanCurrent && cleanTarget && (cleanCurrent === cleanTarget || cleanCurrent.includes(cleanTarget) || cleanTarget.includes(cleanCurrent))) ||
            currentUsername.includes(targetUser) ||
            targetUser.includes(currentUsername)
          ) {
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

      const titleLower = String(notif.title || "").toLowerCase();
      // Silenciar toasts invasivos para confirmaciones ordinarias de envío ("Cotización Enviada a Validación")
      if (titleLower.includes("enviada a validación") || titleLower.includes("enviada a validacion")) {
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

        // 🔔 Notificación nativa en Windows / Celular + Sonido
        const notifQuoteId = notif.quoteId || notif.id || null;
        showLocalNativeNotification({
          title: notif.title,
          body: notif.description || "Tienes una nueva actualización en cotizaciones.",
          quoteId: notifQuoteId,
          url: "/historyquotes",
        });

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
        (data.username && activeUsername && String(data.username).trim().toLowerCase() === String(activeUsername).trim().toLowerCase());

      if (isTargetUser && Array.isArray(data.endpoints)) {
        const now = Date.now();
        // 🛡️ Blindaje estricto contra lluvia de toasts: ignorar ráfagas dentro de 4 segundos
        const isDuplicateBurst = (now - lastPermissionProcessedAtRef.current) < 4000;
        lastPermissionProcessedAtRef.current = now;

        console.log("🔑 [WS PERMISSIONS] Aplicando nuevos permisos y rol en vivo al usuario actual:", data.endpoints, data.role);
        useAuthStore.getState().updateEndpoints(data.endpoints);
        if (data.role) {
          useAuthStore.getState().updateRole(data.role);
        }
        window.dispatchEvent(new Event("permissionsUpdated"));
        window.dispatchEvent(new CustomEvent("permissionsUpdated", { detail: data }));

        if (!isDuplicateBurst) {
          // Refrescar consultas de permisos de forma segura
          queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
          queryClient.invalidateQueries({ queryKey: ["allUsersAdmin"] });
          queryClient.invalidateQueries({ queryKey: ["Services"] });

          const toastId = "ws-user-permissions-updated-toast";
          if (!toast.isActive(toastId)) {
            toast({
              id: toastId,
              title: "🔑 Accesos y Permisos Actualizados",
              description: `Tus accesos han sido actualizados en tiempo real (${data.endpoints.length} permisos activos). Ya puedes acceder a tus nuevas funciones sin recargar.`,
              status: "success",
              duration: 5000,
              isClosable: true,
              position: "top-right",
            });
          }
        }
      } else {
        // Refrescar consultas de usuarios y servicios en cualquier panel de administración abierto
        queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
        queryClient.invalidateQueries({ queryKey: ["allUsersAdmin"] });
        queryClient.invalidateQueries({ queryKey: ["Services"] });
      }
    };

    // 6. Escuchar actualizaciones en vivo del sistema o avisos globales de mantenimiento
    const handleSystemUpdate = (data) => {
      console.log("⚡ [WS EVENT] system:update / app:update_available recibido:", data);
      // Notificar de inmediato al gestor de auto-refresh inteligente
      window.dispatchEvent(new CustomEvent("app:check_updates_now", { detail: data }));
    };

    // 7. Expulsión inmediata por desactivación de cuenta de usuario en tiempo real
    const handleForceLogout = (data) => {
      console.warn("🔒 [WS EVENT] auth:force_logout recibido:", data);
      const activeUserId = useAuthStore.getState().userId;
      const targetUserId = data?.userId;

      if (targetUserId && String(targetUserId) === String(activeUserId)) {
        console.warn("⛔ Tu cuenta ha sido desactivada por el administrador. Cerrando sesión de inmediato...");
        try {
          sessionStorage.setItem("logoutReason", data?.message || "Tu cuenta ha sido desactivada por el administrador.");
        } catch (_) {}
        useAuthStore.getState().logout();
        window.location.href = "/?reason=deactivated";
      }
    };

    const handlePromotionsUpdated = (data) => {
      console.log("⚡ [WS] Evento promotions:updated recibido:", data);
      queryClient.invalidateQueries({ queryKey: ["productPromotions"] });

      if (!data) return;

      const currentUsername = (useAuthStore.getState()?.username || localStorage.getItem("username") || "").trim().toLowerCase();
      const author = String(data?.createdBy || data?.deletedBy || "").trim();
      const authorLower = author.toLowerCase();

      // Si el autor es diferente al usuario actual, mostrar alerta en tiempo real a los demás administradores
      if (author && currentUsername && authorLower !== currentUsername) {
        const toastId = `promo-${data.type}-${data.productCode}`;
        if (!toast.isActive(toastId)) {
          if (data.type === "DELETE") {
            toast({
              id: toastId,
              title: "🏷️ Descuento retirado",
              description: `${author} retiró el descuento del artículo ${data.productCode || ""}.`,
              status: "info",
              duration: 4500,
              isClosable: true,
            });
          } else if (data.type === "SAVE") {
            const pct = data?.promotion?.discountPct;
            toast({
              id: toastId,
              title: "🏷️ Descuento promocional actualizado",
              description: `${author} actualizó la oferta de ${data.productCode || ""}${pct ? ` a -${pct}%` : ""}.`,
              status: "success",
              duration: 4500,
              isClosable: true,
            });
          }
        }
      }
    };

    socket.on("quote:created", handleQuoteCreated);
    socket.on("quote:updated", handleQuoteUpdated);
    socket.on("quote:deleted", handleQuoteDeleted);
    socket.on("notification:new", handleNewNotification);
    socket.on("user:permissions:updated", handlePermissionsUpdated);
    socket.on("system:update", handleSystemUpdate);
    socket.on("app:update_available", handleSystemUpdate);
    socket.on("auth:force_logout", handleForceLogout);
    socket.on("promotions:updated", handlePromotionsUpdated);
    socket.on("promotions:changed", handlePromotionsUpdated);

    return () => {
      window.removeEventListener("click", handleNativePermission);
      window.removeEventListener("touchend", handleNativePermission);
      if (refreshTimer) window.clearTimeout(refreshTimer);
      socket.off("quote:created", handleQuoteCreated);
      socket.off("quote:updated", handleQuoteUpdated);
      socket.off("quote:deleted", handleQuoteDeleted);
      socket.off("notification:new", handleNewNotification);
      socket.off("user:permissions:updated", handlePermissionsUpdated);
      socket.off("system:update", handleSystemUpdate);
      socket.off("app:update_available", handleSystemUpdate);
      socket.off("auth:force_logout", handleForceLogout);
      socket.off("promotions:updated", handlePromotionsUpdated);
      socket.off("promotions:changed", handlePromotionsUpdated);
    };
  }, [queryClient, toast]);
}
