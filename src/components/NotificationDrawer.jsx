import React, { useState, useEffect } from "react";
import {
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  DrawerCloseButton,
  Box,
  Text,
  VStack,
  HStack,
  Icon,
  Badge,
  Flex,
  Button,
  IconButton,
  Tooltip
} from "@chakra-ui/react";
import { FiBell, FiCheckCircle, FiXCircle, FiEye, FiTrash2, FiClock, FiFileText, FiUser } from "react-icons/fi";
import { QuoteDetailDrawer } from "../features/quotes/components/QuoteDetailDrawer";
import { useAuthStore } from "../features/auth/stores/useAuthStore";
import { useQueryClient } from "@tanstack/react-query";
import { useNotifications } from "../features/quotes/hooks/queries/quotesQueries";
import { markNotificationAsRead, deleteNotification, clearNotifications, updateQuote, getQuoteById } from "../features/quotes/services/quoteService";
import { checkQuoteLock, forceUnlockQuote } from "../features/quotes/services/quoteLockService";
import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, ModalCloseButton, Alert, AlertIcon } from "@chakra-ui/react";
import { Lock, Eye } from "lucide-react";
import { useIsAdmin } from "../shared/utils/permissions";

export function NotificationDrawer({ isOpen, onClose, finalFocusRef }) {
  const { username, userId, role } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedQuoteForDrawer, setSelectedQuoteForDrawer] = useState(null);
  const [isQuoteDrawerOpen, setIsQuoteDrawerOpen] = useState(false);
  const [lockAlertTarget, setLockAlertTarget] = useState(null);

  const [localVersion, setLocalVersion] = useState(0);
  const [dismissedKeys, setDismissedKeys] = useState(() => new Set());

  useEffect(() => {
    const handleUpdate = () => setLocalVersion(v => v + 1);
    window.addEventListener("localNotificationsUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("localNotificationsUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const isAdminHook = useIsAdmin();
  const sessionRoleUpper = String(role || localStorage.getItem("role") || "").trim().toUpperCase();
  const isVerifierOrAdminRole =
    isAdminHook ||
    sessionRoleUpper === "ADMIN" ||
    sessionRoleUpper === "ADMINISTRADOR" ||
    sessionRoleUpper.startsWith("ADMIN") ||
    sessionRoleUpper === "FACTURACION" ||
    sessionRoleUpper.includes("DIGIT") ||
    sessionRoleUpper.includes("SUPERVIS") ||
    sessionRoleUpper.includes("CREDIT") ||
    sessionRoleUpper.includes("COBRAN") ||
    sessionRoleUpper.includes("GERENC") ||
    sessionRoleUpper.includes("SISTEMA") ||
    sessionRoleUpper.includes("JEFE");

  const isAdmin = Boolean(isVerifierOrAdminRole);
  const { data: serverNotifs } = useNotifications(
    isAdmin ? "FACTURACION" : "VENDEDOR",
    username
  );

  // Filtra notificaciones que pertenecen estrictamente al usuario en sesión o su rol
  const filterForCurrentUser = (notifs) => {
    if (!username && !role) return [];
    const userLower = (username || "").trim().toLowerCase();
    const roleUpper = (role || localStorage.getItem("role") || "").trim().toUpperCase();
    const isAdminOrMaster =
      isAdmin ||
      roleUpper === "ADMIN" ||
      roleUpper === "ADMINISTRADOR" ||
      roleUpper.startsWith("ADMIN") ||
      roleUpper === "FACTURACION" ||
      roleUpper.includes("DIGIT") ||
      roleUpper.includes("SUPERVIS") ||
      roleUpper.includes("CREDIT") ||
      roleUpper.includes("COBRAN") ||
      roleUpper.includes("GERENC") ||
      roleUpper.includes("SISTEMA") ||
      roleUpper.includes("JEFE");

    return notifs.filter((n) => {
      if (!n || !n.title) return false;
      const targetRoleUpper = (n.targetRole || "").trim().toUpperCase();
      const targetUser = (n.targetUsername || "").trim().toLowerCase();

      if (isAdminOrMaster) {
        // Facturación / Admin / Digitador ONLY ve cotizaciones que requieren revisión/aprobación comercial
        if (
          targetRoleUpper !== "FACTURACION" &&
          targetRoleUpper !== "ADMIN" &&
          targetRoleUpper !== "ADMINISTRADOR" &&
          !targetRoleUpper.startsWith("ADMIN") &&
          !targetRoleUpper.includes("DIGIT") &&
          !targetRoleUpper.includes("SUPERVIS")
        ) {
          return false;
        }
        // Facturación NO ve alertas que son exclusivas del vendedor (órdenes SAP emitidas, anuladas, observadas)
        const statusUpper = String(n.status || "").trim().toUpperCase();
        if (statusUpper === "EMITIDO" || statusUpper === "ANULADO" || statusUpper === "CANCELADO") {
          return false;
        }
        const titleLower = String(n.title || "").toLowerCase();
        if (titleLower.includes("orden sap") || titleLower.includes("pedido emitido") || titleLower.includes("orden de venta") || titleLower.includes("orden emitida") || titleLower.includes("cotización enviada a validación")) {
          return false;
        }
        return true;
      } else {
        // Vendedor: ONLY ve las notificaciones de SU usuario
        if (targetRoleUpper !== "VENDEDOR" && targetRoleUpper !== "SELLER") {
          return false;
        }
        if (targetUser) {
          return (
            targetUser === userLower ||
            userLower.includes(targetUser) ||
            targetUser.includes(userLower)
          );
        }
        return true;
      }
    });
  };

  const myNotifications = React.useMemo(() => {
    let combined = [];

    if (serverNotifs && Array.isArray(serverNotifs)) {
      // La base de datos es la fuente de verdad absoluta
      combined = [...serverNotifs];
      
      // Preservar solo notificaciones WebSocket muy recientes (< 15s) que aún no estén en serverNotifs
      try {
        const raw = localStorage.getItem("grupoLeon_notifications");
        const saved = raw ? JSON.parse(raw) : [];
        if (Array.isArray(saved)) {
          const now = Date.now();
          const serverIds = new Set(serverNotifs.map(s => String(s.id)));
          const serverQuoteIds = new Set(serverNotifs.map(s => String(s.quoteId)));
          const recentLocal = saved.filter(sn => {
            if (sn.read) return false;
            const time = sn.createdAt || sn.timestamp ? new Date(sn.createdAt || sn.timestamp).getTime() : 0;
            const isFresh = (now - time) < 15000;
            return isFresh && !serverIds.has(String(sn.id)) && !serverQuoteIds.has(String(sn.quoteId));
          });
          combined = [...recentLocal, ...combined];
        }
      } catch {}
      
      // Mantener sincronizado el almacenamiento local
      try {
        localStorage.setItem("grupoLeon_notifications", JSON.stringify(combined));
      } catch {}
    } else {
      try {
        const raw = localStorage.getItem("grupoLeon_notifications");
        const saved = raw ? JSON.parse(raw) : [];
        combined = Array.isArray(saved) ? [...saved] : [];
      } catch {}
    }

    const filteredByUser = filterForCurrentUser(combined).filter(
      (n) => !String(n.title || "").includes("- null") &&
             n.quoteId !== null &&
             n.quoteId !== "null" &&
             n.quoteId !== ""
    );

    // Deduplicación inteligente por cotización (conserva 1 solo mensaje canónico por cotización)
    const uniqueMap = new Map();
    const sorted = [...filteredByUser].sort((a, b) => {
      if (!a.read && b.read) return -1;
      if (a.read && !b.read) return 1;
      const tA = new Date(a.createdAt || a.timestamp || a.created_at || a.date || 0).getTime();
      const tB = new Date(b.createdAt || b.timestamp || b.created_at || b.date || 0).getTime();
      return tB - tA;
    });

    for (const notif of sorted) {
      // Clave canónica inteligente para unificar alertas del mismo documento
      const rawQ = String(notif.quoteId || notif.id || "").trim();
      const matchWeb = String(notif.title || "").match(/COT-WEB-(\d+)/i) || 
                       String(notif.title || "").match(/COT-(\d+)/i) ||
                       rawQ.match(/COT-WEB-(\d+)/i) || 
                       rawQ.match(/COT-(\d+)/i) || 
                       rawQ.match(/^(\d+)$/);
      const canonicalKey = matchWeb ? `QUOTE-${Number(matchWeb[1])}` : rawQ;

      // ⚡ Omitir de inmediato si fue descartada por el usuario (0ms)
      if (
        dismissedKeys.has(String(notif.id)) ||
        dismissedKeys.has(String(notif.quoteId)) ||
        dismissedKeys.has(canonicalKey) ||
        (matchWeb && dismissedKeys.has(`QUOTE-${Number(matchWeb[1])}`))
      ) {
        continue;
      }

      if (!uniqueMap.has(canonicalKey)) {
        uniqueMap.set(canonicalKey, notif);
      }
    }

    return Array.from(uniqueMap.values()).slice(0, 30);
  }, [serverNotifs, username, userId, role, isAdmin, localVersion, dismissedKeys]);

  const unreadCount = React.useMemo(() => {
    return myNotifications.filter((n) => !n.read).length;
  }, [myNotifications]);

  const handleClearAll = () => {
    // ⚡ 1. Descartar todas las alertas actuales de inmediato (0ms de latencia en pantalla)
    setDismissedKeys(prev => {
      const next = new Set(prev);
      myNotifications.forEach(n => {
        if (n.id) next.add(String(n.id));
        if (n.quoteId) next.add(String(n.quoteId));
        const rawQ = String(n.quoteId || n.id || "").trim();
        const matchWeb = rawQ.match(/COT-WEB-(\d+)/i) || rawQ.match(/COT-(\d+)/i) || rawQ.match(/(\d+)/);
        if (matchWeb) next.add(`QUOTE-${Number(matchWeb[1])}`);
      });
      return next;
    });

    // ⚡ 2. Limpieza inmediata de almacenamiento local
    try {
      localStorage.setItem("grupoLeon_notifications", "[]");
      window.dispatchEvent(new Event("localNotificationsUpdated"));
      setLocalVersion(v => v + 1);
    } catch {}

    // ⚡ 3. Limpieza optimista en caché de React Query (0ms)
    queryClient.setQueriesData({ queryKey: ["notifications"] }, []);

    // ⚡ 4. Notificar al servidor en segundo plano
    clearNotifications(isAdmin ? "FACTURACION" : undefined, username)
      .catch(e => console.error("Error clearing server notifications:", e))
      .finally(() => {
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      });
  };

  const handleDeleteNotif = (id, quoteId) => {
    const rawQ = String(quoteId || id || "").trim();
    const matchWeb = rawQ.match(/COT-WEB-(\d+)/i) || rawQ.match(/COT-(\d+)/i) || rawQ.match(/(\d+)/);
    const canonicalKey = matchWeb ? `QUOTE-${Number(matchWeb[1])}` : rawQ;

    // ⚡ 1. ACTUALIZACIÓN OPTIMISTA INMEDIATA (0ms): La alerta desaparece al instante de la UI
    setDismissedKeys(prev => {
      const next = new Set(prev);
      if (id) next.add(String(id));
      if (quoteId) next.add(String(quoteId));
      if (canonicalKey) next.add(canonicalKey);
      if (matchWeb) next.add(`QUOTE-${Number(matchWeb[1])}`);
      return next;
    });

    // ⚡ 2. Limpieza inmediata del almacenamiento local
    try {
      const raw = localStorage.getItem("grupoLeon_notifications");
      const all = raw ? JSON.parse(raw) : [];
      const updated = all.filter((n) => {
        if (id && String(n.id) === String(id)) return false;
        if (quoteId && String(n.quoteId || n.id) === String(quoteId)) return false;
        if (id && String(n.quoteId) === String(id)) return false;
        if (matchWeb && String(n.quoteId || n.title || "").includes(String(matchWeb[1]))) return false;
        return true;
      });
      localStorage.setItem("grupoLeon_notifications", JSON.stringify(updated));
      window.dispatchEvent(new Event("localNotificationsUpdated"));
      setLocalVersion(v => v + 1);
    } catch {}

    // ⚡ 3. Actualización optimista de caché de React Query (0ms)
    queryClient.setQueriesData({ queryKey: ["notifications"] }, (old) => {
      if (!Array.isArray(old)) return [];
      return old.filter((n) => {
        if (id && String(n.id) === String(id)) return false;
        if (quoteId && String(n.quoteId || n.id) === String(quoteId)) return false;
        if (matchWeb && String(n.quoteId || n.title || "").includes(String(matchWeb[1]))) return false;
        return true;
      });
    });

    // ⚡ 4. Sincronización asíncrona en segundo plano sin congelar la interfaz
    Promise.allSettled([
      deleteNotification(id, quoteId),
      markNotificationAsRead(id, quoteId),
    ]).finally(() => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    });
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Hace un momento";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Hace un momento";

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    const timeStr = date.toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: true });

    if (diffMins < 1) return `Ahora mismo • ${timeStr}`;
    if (diffMins < 60) return `Hace ${diffMins} min • ${timeStr}`;
    if (diffHours < 24) return `Hoy a las ${timeStr} • Hace ${diffHours} h`;
    if (diffDays === 1) return `Ayer a las ${timeStr}`;
    if (diffDays < 7) {
      const dayNum = date.toLocaleDateString("es-PE", { weekday: "short", day: "numeric", month: "short" });
      return `Hace ${diffDays} días • ${dayNum} (${timeStr})`;
    }

    return `${date.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })} • ${timeStr}`;
  };

  const handleOpenQuote = (quoteObj, quoteId, notifId) => {
    let targetDoc = quoteObj ? { ...quoteObj } : null;
    const targetId = quoteId || quoteObj?.docNumber || quoteObj?.id;

    // Concurrencia de Digitación: Verificar si otro usuario ya la tiene abierta
    if (targetId) {
      const lockCheck = checkQuoteLock(targetId, userId, username);
      if (lockCheck.isLocked && !isAdmin) {
        setLockAlertTarget({ quoteId: targetId, lockInfo: lockCheck.lockInfo });
        return;
      }
    }

    const extractItems = (doc) => {
      if (!doc) return [];
      if (Array.isArray(doc.products) && doc.products.length > 0) return doc.products;
      if (Array.isArray(doc.items) && doc.items.length > 0) return doc.items;
      if (Array.isArray(doc.lines) && doc.lines.length > 0) return doc.lines;
      if (doc.totals && Array.isArray(doc.totals.normalizedProducts) && doc.totals.normalizedProducts.length > 0) return doc.totals.normalizedProducts;
      if (doc.totals && Array.isArray(doc.totals.products) && doc.totals.products.length > 0) return doc.totals.products;
      return [];
    };

    // ⚡ 1. Resolución ultra rápida desde memoria / caché de React Query
    let items = extractItems(targetDoc);

    if (items.length === 0 && targetId) {
      try {
        const cachedQuotes = queryClient.getQueryData(["quotes"]);
        if (Array.isArray(cachedQuotes)) {
          const found = cachedQuotes.find((q) => 
            String(q.id) === String(targetId) || 
            String(q.docNumber) === String(targetId) ||
            String(q.sapDocNum) === String(targetId)
          );
          if (found) {
            targetDoc = { ...found, ...(targetDoc || {}) };
            items = extractItems(found);
          }
        }
      } catch {}

      // ⚡ 2. Fallback instantáneo en localStorage
      if (items.length === 0) {
        try {
          const savedQuotes = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
          const found = savedQuotes.find((q) => 
            String(q.id) === String(targetId) || 
            String(q.docNumber) === String(targetId) ||
            String(q.sapDocNum) === String(targetId)
          );
          if (found) {
            targetDoc = { ...found, ...(targetDoc || {}) };
            items = extractItems(found);
          }
        } catch {}
      }
    }

    if (!targetDoc) {
      targetDoc = { id: targetId, docNumber: targetId };
    }
    targetDoc.products = items;

    // ⚡ 3. APERTURA INSTANTÁNEA (0ms): Cerrar campanita y desplegar el detalle inmediatamente
    onClose();
    setSelectedQuoteForDrawer(targetDoc);
    setIsQuoteDrawerOpen(true);

    // ⚡ 4. Marcar como leída de forma asíncrona sin bloquear la interfaz
    try {
      markNotificationAsRead(notifId, targetId);
      queryClient.invalidateQueries({ queryKey: ["notifications"], refetchType: "none" });
      const raw = localStorage.getItem("grupoLeon_notifications");
      const all = raw ? JSON.parse(raw) : [];
      const updated = all.map(n => {
        if ((notifId && String(n.id) === String(notifId)) || (targetId && String(n.quoteId) === String(targetId))) {
          return { ...n, read: true };
        }
        return n;
      });
      localStorage.setItem("grupoLeon_notifications", JSON.stringify(updated));
      window.dispatchEvent(new Event("localNotificationsUpdated"));
      setLocalVersion(v => v + 1);
    } catch (e) {}

    // ⚡ 5. Sincronización en segundo plano con el servidor (sin congelar la pantalla del usuario)
    if (targetId) {
      getQuoteById(targetId)
        .then((liveQuote) => {
          if (liveQuote && (liveQuote.id || liveQuote.docNumber)) {
            setSelectedQuoteForDrawer((prev) => {
              if (!prev) return liveQuote;
              const serverItems = extractItems(liveQuote);
              return {
                ...prev,
                ...liveQuote,
                products: serverItems.length > 0 ? serverItems : prev.products,
              };
            });
          }
        })
        .catch(() => {});
    }
  };

  const displayName = username || userId || "Usuario";

  return (
    <>
      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        finalFocusRef={finalFocusRef}
        size={{ base: "full", md: "md" }}
        blockScrollOnMount={true}
        preserveScrollBarGap={false}
      >
        <DrawerOverlay bg="blackAlpha.700" transition="opacity 0.15s ease-out" />
        <DrawerContent
          borderLeftRadius={{ base: "none", md: "2xl" }}
          bg="slate.50"
          w="full"
          maxW={{ base: "100vw", md: "450px" }}
        >
          <DrawerCloseButton mt={2} color="white" w="44px" h="44px" />
          <DrawerHeader bg="#126C36" color="white" pt={4} pb={4} px={{ base: 4, md: 5 }}>
            <HStack spacing={3} pr={10}>
              <Flex
                w="40px"
                h="40px"
                minW="40px"
                borderRadius="xl"
                bg="whiteAlpha.200"
                border="1px solid rgba(255,255,255,0.3)"
                align="center"
                justify="center"
                color="white"
                boxShadow="md"
              >
                <Icon as={FiBell} boxSize={5} />
              </Flex>
              <Box flex="1" minW={0}>
                <HStack spacing={2} justify="space-between" wrap="wrap">
                  <Text fontSize={{ base: "md", md: "lg" }} fontWeight="900" color="white">
                    Centro de Notificaciones
                  </Text>
                  {unreadCount > 0 ? (
                    <Badge colorScheme="red" variant="solid" borderRadius="full" px={2.5} py={0.5} fontSize="xs" fontWeight="900">
                      {unreadCount} {unreadCount === 1 ? "Alerta" : "Alertas"}
                    </Badge>
                  ) : (
                    <Badge colorScheme="whiteAlpha" variant="subtle" borderRadius="full" px={2} py={0.5} fontSize="xs" fontWeight="700">
                      0 Alertas
                    </Badge>
                  )}
                </HStack>
                <HStack spacing={1.5} mt={0.5}>
                  <Icon as={FiUser} boxSize={3} color="whiteAlpha.700" />
                  <Text fontSize={{ base: "13px", md: "xs" }} color="whiteAlpha.900" fontWeight="600" isTruncated>
                    {displayName}
                  </Text>
                </HStack>
              </Box>
            </HStack>
          </DrawerHeader>

          <DrawerBody px={{ base: 3, md: 4 }} py={4} bg="gray.50" overflowX="hidden">
            <Flex justify="space-between" align="center" mb={3.5} wrap="wrap" gap={2}>
              <HStack spacing={2} wrap="wrap">
                <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="800" color="gray.800" textTransform="uppercase" letterSpacing="wide">
                  Mis Alertas ({unreadCount > 0 ? `${unreadCount} pendientes` : `${myNotifications.length} registradas`})
                </Text>
                <Badge colorScheme="green" variant="subtle" fontSize="9px">
                  Solo mis notificaciones
                </Badge>
              </HStack>
              {myNotifications.length > 0 && (
                <Button
                  size={{ base: "sm", md: "xs" }}
                  variant="ghost"
                  colorScheme="red"
                  onClick={handleClearAll}
                  fontSize={{ base: "13px", md: "11px" }}
                  fontWeight="700"
                >
                  Limpiar Mis Alertas
                </Button>
              )}
            </Flex>

            {myNotifications.length === 0 ? (
              <VStack py={14} spacing={3} color="gray.400">
                <Flex w="54px" h="54px" borderRadius="full" bg="emerald.50" align="center" justify="center" color="emerald.600">
                  <Icon as={FiCheckCircle} boxSize={8} />
                </Flex>
                <Text fontSize={{ base: "md", md: "sm" }} fontWeight="800" color="gray.700">
                  Sin notificaciones pendientes
                </Text>
                <Text fontSize={{ base: "13px", md: "xs" }} color="gray.600" textAlign="center" maxW="280px" lineHeight="1.6">
                  No hay alertas comerciales activas para <strong>{displayName}</strong>. Las notificaciones aparecerán aquí cuando haya actividad en tus cotizaciones.
                </Text>
              </VStack>
            ) : (
              <VStack spacing={3} align="stretch">
                {myNotifications.map((item) => {
                  const isApproved = item.status === "APROBADO" || item.status === "APROBADO_COMERCIAL";
                  const isEmitido = item.status === "EMITIDO";
                  const isRejected = item.status === "RECHAZADO";
                  const isObservado = item.status === "OBSERVADO";

                  let iconComponent = FiFileText;
                  let iconColor = "blue.600";
                  let iconBg = "blue.50";
                  let borderLeftColor = "blue.500";
                  let statusBadge = <Badge colorScheme="blue" fontSize="9px">⏳ PENDIENTE REVISIÓN</Badge>;

                  if (isEmitido) {
                    iconComponent = FiCheckCircle;
                    iconColor = "emerald.600";
                    iconBg = "emerald.50";
                    borderLeftColor = "emerald.500";
                    statusBadge = <Badge colorScheme="green" fontSize="9px">🏛️ EMITIDO EN SAP</Badge>;
                  } else if (isApproved) {
                    iconComponent = FiCheckCircle;
                    iconColor = "teal.600";
                    iconBg = "teal.50";
                    borderLeftColor = "teal.500";
                    statusBadge = <Badge colorScheme="teal" fontSize="9px">✅ APROBADO COMERCIAL</Badge>;
                  } else if (isObservado) {
                    iconComponent = FiFileText;
                    iconColor = "orange.600";
                    iconBg = "orange.50";
                    borderLeftColor = "orange.500";
                    statusBadge = <Badge colorScheme="orange" fontSize="9px">⚠️ OBSERVADO</Badge>;
                  } else if (isRejected) {
                    iconComponent = FiXCircle;
                    iconColor = "red.600";
                    iconBg = "red.50";
                    borderLeftColor = "red.500";
                    statusBadge = <Badge colorScheme="red" fontSize="9px">❌ RECHAZADO</Badge>;
                  }

                  return (
                    <Box
                      key={item.id}
                      p={4}
                      borderRadius="2xl"
                      border="1px solid"
                      borderColor={item.read ? "gray.200" : "emerald.300"}
                      borderLeft="5px solid"
                      borderLeftColor={borderLeftColor}
                      bg={item.read ? "whiteAlpha.800" : "white"}
                      boxShadow={item.read ? "none" : "sm"}
                      _hover={{ boxShadow: "md", transform: "translateY(-1px)", borderColor: "emerald.400" }}
                      transition="all 0.2s"
                      cursor="pointer"
                      onClick={() => handleOpenQuote(item.quoteObj, item.quoteId, item.id)}
                    >
                      <VStack align="stretch" spacing={2.5}>
                        <Flex justify="space-between" align="flex-start" gap={2}>
                          <HStack spacing={2} minW={0} align="flex-start" wrap="wrap">
                            <Flex
                              w="28px"
                              h="28px"
                              minW="28px"
                              borderRadius="md"
                              bg={iconBg}
                              align="center"
                              justify="center"
                              flexShrink={0}
                            >
                              <Icon as={iconComponent} boxSize={4} color={iconColor} />
                            </Flex>
                            <Text fontSize={{ base: "13px", md: "xs" }} fontWeight="900" color="gray.900" overflowWrap="anywhere">
                              {item.title}
                            </Text>
                            {!item.read && (
                              <Badge colorScheme="green" variant="solid" fontSize="8px" borderRadius="full" px={1.5} py={0.5}>
                                NUEVA
                              </Badge>
                            )}
                          </HStack>
                          <Tooltip label="Eliminar alerta" hasArrow placement="top">
                            <IconButton
                              icon={<Icon as={FiTrash2} boxSize={4} />}
                              size={{ base: "sm", md: "xs" }}
                              variant="ghost"
                              colorScheme="gray"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteNotif(item.id, item.quoteId);
                              }}
                              aria-label="Eliminar alerta"
                              flexShrink={0}
                              w={{ base: "40px", md: "auto" }}
                              h={{ base: "40px", md: "auto" }}
                            />
                          </Tooltip>
                        </Flex>

                        <HStack spacing={1.5} fontSize={{ base: "11px", md: "10px" }} color="gray.600">
                          <Icon as={FiClock} boxSize={3} color="emerald.600" />
                          <Text fontWeight="700">
                            {formatTimeAgo(item.createdAt || item.timestamp || item.created_at || item.date)}
                          </Text>
                        </HStack>

                        <Text
                          fontSize={{ base: "13px", md: "xs" }}
                          color="gray.800"
                          fontWeight="500"
                          lineHeight="1.6"
                          bg="gray.50"
                          p={2.5}
                          borderRadius="lg"
                          border="1px solid"
                          borderColor="gray.150"
                          overflowWrap="anywhere"
                        >
                          {item.description}
                        </Text>

                        {item.fromUsername && (
                          <HStack spacing={1}>
                            <Icon as={FiUser} boxSize={3} color="gray.500" />
                            <Text fontSize={{ base: "11px", md: "10px" }} color="gray.500" fontWeight="600">
                              De: {item.fromUsername}
                            </Text>
                          </HStack>
                        )}

                        {(item.hasDiscount || String(item.title || "").includes("Descuento") || String(item.description || "").includes("DESCUENTO")) && (
                          <Badge
                            colorScheme="purple"
                            variant="solid"
                            fontSize="10px"
                            px={2.5}
                            py={1}
                            borderRadius="md"
                            fontWeight="900"
                            w="fit-content"
                            boxShadow="xs"
                          >
                            ⚡ REQUIERE APROBACIÓN DE DESCUENTO
                          </Badge>
                        )}

                        <Flex
                          justify="space-between"
                          align={{ base: "flex-start", sm: "center" }}
                          direction={{ base: "column", sm: "row" }}
                          gap={2}
                          pt={1}
                        >
                          {statusBadge}
                          <Button
                            size={{ base: "md", md: "xs" }}
                            w={{ base: "full", sm: "auto" }}
                            colorScheme={isEmitido || isApproved ? "green" : isRejected ? "red" : isObservado ? "orange" : "teal"}
                            bg={!isEmitido && !isApproved && !isRejected && !isObservado ? "#0f766e" : undefined}
                            _hover={!isEmitido && !isApproved && !isRejected && !isObservado ? { bg: "#115e59" } : undefined}
                            leftIcon={<Icon as={FiEye} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenQuote(item.quoteObj, item.quoteId, item.id);
                            }}
                            fontWeight="800"
                            px={3}
                            boxShadow="xs"
                          >
                            {isAdmin
                              ? "🔍 Verificar Cotización"
                              : (isRejected || item.status === "OBSERVADO")
                              ? "✏️ Subsanar Cotización"
                              : "👁️ Ver Cotización"}
                          </Button>
                        </Flex>
                      </VStack>
                    </Box>
                  );
                })}
              </VStack>
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* Drawer de Detalle de Cotización desde la Campanita */}
      {isQuoteDrawerOpen && selectedQuoteForDrawer && (
        <QuoteDetailDrawer
          isOpen={isQuoteDrawerOpen}
          onClose={() => setIsQuoteDrawerOpen(false)}
          quote={selectedQuoteForDrawer}
          onUpdateStatus={async (quoteId, newStatus, reasonNote) => {
            const savedQuotes = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
            const idStr = String(quoteId || "").trim();
            const cleanId = idStr.replace(/^COT-0*/i, "");
            const nowIso = new Date().toISOString();

            let targetDoc = null;
            const updated = savedQuotes.map((q) => {
              const qDoc = String(q.docNumber || "").trim();
              const qId = String(q.id !== undefined && q.id !== null ? q.id : "").trim();
              const cleanDoc = qDoc.replace(/^COT-0*/i, "");
              const cleanQId = qId.replace(/^COT-0*/i, "");

              const isMatch = (qDoc && qDoc === idStr) || (qId && qId === idStr) || (cleanId && (cleanDoc === cleanId || cleanQId === cleanId));
              if (isMatch) {
                const currentHistory = q.historyLog || [];
                const doc = {
                  ...q,
                  approvalStatus: newStatus,
                  status: newStatus,
                  state: newStatus,
                  rejectionReason: newStatus === "RECHAZADO" || newStatus === "OBSERVADO" ? reasonNote : q.rejectionReason,
                  observationReason: newStatus === "OBSERVADO" ? reasonNote : q.observationReason,
                  observedAt: newStatus === "OBSERVADO" ? nowIso : q.observedAt,
                  observedBy: newStatus === "OBSERVADO" ? (username || "Administrador") : q.observedBy,
                  updatedAt: nowIso,
                  historyLog: [
                    {
                      status: newStatus,
                      timestamp: nowIso,
                      user: username || "Administrador",
                      note: reasonNote || `Cambio de estado a ${newStatus}`
                    },
                    ...currentHistory
                  ]
                };
                targetDoc = doc;
                return doc;
              }
              return q;
            });

            localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
            window.dispatchEvent(new Event("localQuotesUpdated"));

            if (targetDoc) {
              try {
                await updateQuote(targetDoc);
              } catch (e) {
                console.error("Error sincronizando estado desde NotificationDrawer:", e);
              }
            }
          }}
        />
      )}

      {/* Modal de Concurrencia desde Notificación */}
      <Modal isOpen={!!lockAlertTarget} onClose={() => setLockAlertTarget(null)} isCentered size="md">
        <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(3px)" />
        <ModalContent borderRadius="2xl" p={2}>
          <ModalHeader display="flex" alignItems="center" gap={2} color="#b45309" fontSize="md">
            <Lock className="w-5 h-5 text-amber-600" />
            Cotización en Revisión Activa
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={3}>
              <Alert status="warning" borderRadius="xl" bg="#fffbeb" border="1.5px solid #fde68a" p={3.5}>
                <AlertIcon />
                <Box fontSize="xs">
                  <Text fontWeight="900" color="#92400e">
                    Esta cotización ({lockAlertTarget?.quoteId}) ya fue abierta y está siendo atendida en este momento.
                  </Text>
                  <Text color="#78350f" mt={1.5} fontWeight="700">
                    👤 Atendida por: <strong>{lockAlertTarget?.lockInfo?.lockedByUsername}</strong> ({lockAlertTarget?.lockInfo?.lockedByProfile})
                  </Text>
                  <Text color="#92400e" mt={0.5} fontSize="11px">
                    ⏰ Inicio de verificación: {lockAlertTarget?.lockInfo?.lockedAt ? new Date(lockAlertTarget.lockInfo.lockedAt).toLocaleTimeString() : "Recientemente"}
                  </Text>
                </Box>
              </Alert>
              <Text fontSize="xs" color="gray.600" fontWeight="600">
                Para evitar emisión duplicada de órdenes en SAP o inconsistencia de datos, no se permite que dos personas de digitación la verifiquen simultáneamente.
              </Text>
            </VStack>
          </ModalBody>
          <ModalFooter gap={2}>
            {isAdmin && (
              <Button
                colorScheme="red"
                variant="outline"
                size="sm"
                fontWeight="800"
                onClick={() => {
                  forceUnlockQuote(lockAlertTarget?.quoteId);
                  setLockAlertTarget(null);
                }}
              >
                ⚠️ Forzar Desbloqueo (Admin)
              </Button>
            )}
            <Button
              colorScheme="blue"
              variant="outline"
              size="sm"
              fontWeight="700"
              leftIcon={<Eye className="w-4 h-4" />}
              onClick={async () => {
                const targetId = lockAlertTarget?.quoteId;
                setLockAlertTarget(null);
                if (targetId) {
                  try {
                    const q = await getQuoteById(targetId);
                    if (q) {
                      setSelectedQuoteForDrawer(q);
                      setIsQuoteDrawerOpen(true);
                    }
                  } catch (e) {
                    console.error("Error cargando cotización para modo solo lectura:", e);
                  }
                }
              }}
            >
              👁️ Ver en Modo Solo Lectura
            </Button>
            <Button colorScheme="gray" size="sm" fontWeight="700" onClick={() => setLockAlertTarget(null)}>
              Entendido / Cerrar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}

export default NotificationDrawer;
