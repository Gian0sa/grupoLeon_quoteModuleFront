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
import { markNotificationAsRead, deleteNotification, clearNotifications, updateQuote } from "../features/quotes/services/quoteService";

export function NotificationDrawer({ isOpen, onClose }) {
  const { username, userId, role } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedQuoteForDrawer, setSelectedQuoteForDrawer] = useState(null);
  const [isQuoteDrawerOpen, setIsQuoteDrawerOpen] = useState(false);

  const [localVersion, setLocalVersion] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setLocalVersion(v => v + 1);
    window.addEventListener("localNotificationsUpdated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("localNotificationsUpdated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const { data: serverNotifs } = useNotifications(
    role === "ADMIN" ? "FACTURACION" : undefined,
    username
  );

  // Filtra notificaciones que pertenecen al usuario en sesión o su rol
  const filterForCurrentUser = (notifs) => {
    if (!username && !userId && !role) return [];
    const userLower = (username || "").toLowerCase();
    const roleUpper = (role || "").toUpperCase();
    const isAdminOrEnrique = roleUpper === "ADMIN" || roleUpper === "FACTURACION" || roleUpper === "SUPERVISOR" || userLower.includes("enrique");

    return notifs.filter((n) => {
      const targetUser = (n.targetUsername || "").toLowerCase();
      const targetRoleUpper = (n.targetRole || "").toUpperCase();

      // 1. Coincidencia por nombre de usuario de destino
      if (targetUser && userLower && (targetUser === userLower || userLower.includes(targetUser) || targetUser.includes(userLower))) {
        return true;
      }
      // 2. Coincidencia por rol de Facturación / Administración
      if ((targetRoleUpper === "FACTURACION" || targetRoleUpper === "ADMIN") && isAdminOrEnrique) {
        return true;
      }
      // 3. Coincidencia por rol de Vendedor
      if ((targetRoleUpper === "VENDEDOR" || targetRoleUpper === "SELLER") && !isAdminOrEnrique) {
        return true;
      }
      // 4. Coincidencia por ID de usuario
      if (n.targetUserId && userId && String(n.targetUserId) === String(userId)) {
        return true;
      }
      return false;
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
      (n) => n.status !== "ANULADO" && !String(n.title || "").toLowerCase().includes("anulad") && !n.read
    );

    // Deduplicación inteligente por quoteId (conserva la alerta más reciente por cotización)
    const uniqueMap = new Map();
    const sorted = [...filteredByUser].sort((a, b) => {
      const tA = new Date(a.createdAt || a.timestamp || a.created_at || a.date || 0).getTime();
      const tB = new Date(b.createdAt || b.timestamp || b.created_at || b.date || 0).getTime();
      return tB - tA;
    });

    for (const notif of sorted) {
      const key = String(notif.quoteId || notif.id);
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, notif);
      }
    }

    return Array.from(uniqueMap.values());
  }, [serverNotifs, username, userId, role, localVersion]);

  const handleClearAll = async () => {
    try {
      await clearNotifications(role === "ADMIN" ? "FACTURACION" : undefined, username);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      console.error("Error clearing server notifications:", e);
    }

    try {
      const raw = localStorage.getItem("grupoLeon_notifications");
      const all = raw ? JSON.parse(raw) : [];
      const remaining = all.filter((n) => {
        if (n.targetUsername && username) {
          return n.targetUsername.toLowerCase() !== username.toLowerCase();
        }
        if (n.targetRole === "FACTURACION" && (role === "ADMIN" || username?.toLowerCase() === "enrique")) {
          return false;
        }
        if (n.targetUserId && userId) {
          return String(n.targetUserId) !== String(userId);
        }
        return true;
      });
      localStorage.setItem("grupoLeon_notifications", JSON.stringify(remaining));
      window.dispatchEvent(new Event("localNotificationsUpdated"));
      setLocalVersion(v => v + 1);
    } catch {}
  };

  const handleDeleteNotif = async (id, quoteId) => {
    try {
      await deleteNotification(id, quoteId);
      await markNotificationAsRead(id, quoteId);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      console.error("Error deleting notif:", e);
    }

    try {
      const raw = localStorage.getItem("grupoLeon_notifications");
      const all = raw ? JSON.parse(raw) : [];
      const updated = all.filter((n) => {
        if (id && String(n.id) === String(id)) return false;
        if (quoteId && String(n.quoteId || n.id) === String(quoteId)) return false;
        if (id && String(n.quoteId) === String(id)) return false;
        return true;
      });
      localStorage.setItem("grupoLeon_notifications", JSON.stringify(updated));
      window.dispatchEvent(new Event("localNotificationsUpdated"));
      setLocalVersion(v => v + 1);
    } catch {}
  };

  const formatTimeAgo = (rawDate) => {
    if (!rawDate) return "Reciente";
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) return "Reciente";

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();

    if (diffMs < 0) return "Justo ahora";

    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    const timeStr = date.toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    if (diffMins < 1) return `Justo ahora (${timeStr})`;
    if (diffMins < 60) return `Hace ${diffMins} min (${timeStr})`;

    const isToday = now.toDateString() === date.toDateString();
    if (isToday) {
      return `Hoy a las ${timeStr} • Hace ${diffHours} h`;
    }

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();
    if (isYesterday) {
      return `Ayer a las ${timeStr}`;
    }

    if (diffDays < 7) {
      const dayNum = date.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
      return `Hace ${diffDays} días • ${dayNum} (${timeStr})`;
    }

    return `${date.toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" })} • ${timeStr}`;
  };

  const handleOpenQuote = (quoteObj, quoteId, notifId) => {
    let targetDoc = quoteObj ? { ...quoteObj } : null;
    const targetId = quoteId || quoteObj?.docNumber || quoteObj?.id;

    const extractItems = (doc) => {
      if (!doc) return [];
      if (Array.isArray(doc.products) && doc.products.length > 0) return doc.products;
      if (Array.isArray(doc.items) && doc.items.length > 0) return doc.items;
      if (Array.isArray(doc.lines) && doc.lines.length > 0) return doc.lines;
      if (doc.totals && Array.isArray(doc.totals.normalizedProducts) && doc.totals.normalizedProducts.length > 0) return doc.totals.normalizedProducts;
      if (doc.totals && Array.isArray(doc.totals.products) && doc.totals.products.length > 0) return doc.totals.products;
      return [];
    };

    let items = extractItems(targetDoc);

    if (items.length === 0 && targetId) {
      // 1. Buscar en caché de React Query
      try {
        const cachedQuotes = queryClient.getQueryData(["quotes"]);
        if (Array.isArray(cachedQuotes)) {
          const found = cachedQuotes.find((q) => String(q.id || q.docNumber) === String(targetId));
          if (found) {
            targetDoc = { ...found, ...(targetDoc || {}) };
            items = extractItems(found);
          }
        }
      } catch {}

      // 2. Buscar en localStorage
      if (items.length === 0) {
        try {
          const savedQuotes = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
          const found = savedQuotes.find((q) => String(q.id || q.docNumber) === String(targetId));
          if (found) {
            targetDoc = { ...found, ...(targetDoc || {}) };
            items = extractItems(found);
          }
        } catch {}
      }
    }

    if (!targetDoc) {
      targetDoc = {
        id: targetId,
        docNumber: targetId,
        state: "ENVIADO",
      };
    }

    targetDoc.products = items;

    // Auto-descartar / marcar como leída al abrir (comportamiento smartphone)
    handleDeleteNotif(notifId, targetId);

    onClose(); // Cierra el panel de notificaciones para liberar el scroll móvil
    setSelectedQuoteForDrawer(targetDoc);
    setIsQuoteDrawerOpen(true);
  };

  const displayName = username || userId || "Usuario";

  return (
    <>
      <Drawer
        isOpen={isOpen}
        placement="right"
        onClose={onClose}
        size={{ base: "full", md: "md" }}
        blockScrollOnMount={true}
        preserveScrollBarGap={false}
        autoFocus={false}
      >
        <DrawerOverlay bg="blackAlpha.700" backdropFilter="blur(4px)" transition="opacity 0.15s ease-out" />
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
                  {myNotifications.length > 0 && (
                    <Badge colorScheme="red" variant="solid" borderRadius="full" px={2.5} py={0.5} fontSize="xs" fontWeight="900">
                      {myNotifications.length} Alertas
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
                  Mis Alertas ({myNotifications.length})
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
                  const isApproved = item.status === "APROBADO";
                  const isRejected = item.status === "RECHAZADO";

                  let iconComponent = FiFileText;
                  let iconColor = "blue.600";
                  let iconBg = "blue.50";
                  let borderLeftColor = "blue.500";
                  let statusBadge = <Badge colorScheme="blue" fontSize="9px">⏳ PENDIENTE REVISIÓN</Badge>;

                  if (isApproved) {
                    iconComponent = FiCheckCircle;
                    iconColor = "emerald.600";
                    iconBg = "emerald.50";
                    borderLeftColor = "emerald.500";
                    statusBadge = <Badge colorScheme="green" fontSize="9px">✅ APROBADO EN SAP</Badge>;
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
                      borderColor="gray.200"
                      borderLeft="5px solid"
                      borderLeftColor={borderLeftColor}
                      bg="white"
                      boxShadow="sm"
                      _hover={{ boxShadow: "md", transform: "translateY(-1px)", borderColor: "emerald.300" }}
                      transition="all 0.2s"
                      cursor="pointer"
                      onClick={() => handleOpenQuote(item.quoteObj, item.quoteId, item.id)}
                    >
                      <VStack align="stretch" spacing={2.5}>
                        <Flex justify="space-between" align="flex-start" gap={2}>
                          <HStack spacing={2} minW={0} align="flex-start">
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
                            colorScheme={isApproved ? "green" : isRejected ? "red" : "teal"}
                            bg={!isApproved && !isRejected ? "#0f766e" : undefined}
                            _hover={!isApproved && !isRejected ? { bg: "#115e59" } : undefined}
                            leftIcon={<Icon as={FiEye} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenQuote(item.quoteObj, item.quoteId, item.id);
                            }}
                            fontWeight="800"
                            px={3}
                            boxShadow="xs"
                          >
                            {(role === "ADMIN" || username?.toLowerCase() === "enrique")
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
    </>
  );
}

export default NotificationDrawer;
