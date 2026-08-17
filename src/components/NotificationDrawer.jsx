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
import { markNotificationAsRead, clearNotifications } from "../features/quotes/services/quoteService";

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

  // Filtra notificaciones que pertenecen SOLO al usuario en sesión
  const filterForCurrentUser = (notifs) => {
    if (!username && !userId) return [];
    return notifs.filter((n) => {
      if (n.targetUsername && username) {
        return n.targetUsername.toLowerCase() === username.toLowerCase();
      }
      if (n.targetRole === "FACTURACION" && (role === "ADMIN" || username?.toLowerCase() === "enrique")) {
        return true;
      }
      if (n.targetUserId && userId) {
        return String(n.targetUserId) === String(userId);
      }
      return false;
    });
  };

  const myNotifications = React.useMemo(() => {
    let combined = [];
    try {
      const raw = localStorage.getItem("grupoLeon_notifications");
      const saved = raw ? JSON.parse(raw) : [];
      combined = Array.isArray(saved) ? [...saved] : [];
    } catch {}

    if (serverNotifs && Array.isArray(serverNotifs) && serverNotifs.length > 0) {
      serverNotifs.forEach(sn => {
        const idx = combined.findIndex(c => String(c.id) === String(sn.id) || (c.quoteId === sn.quoteId && c.status === sn.status));
        if (idx >= 0) {
          combined[idx] = { ...combined[idx], ...sn };
        } else {
          combined.unshift(sn);
        }
      });
    }

    return filterForCurrentUser(combined);
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
        if (n.targetUserId && userId) {
          return String(n.targetUserId) !== String(userId);
        }
        return true;
      });
      localStorage.setItem("grupoLeon_notifications", JSON.stringify(remaining));
      window.dispatchEvent(new Event("localNotificationsUpdated"));
    } catch {}
  };

  const handleDeleteNotif = async (id) => {
    try {
      await markNotificationAsRead(id);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (e) {
      console.error("Error marking notif read:", e);
    }

    try {
      const raw = localStorage.getItem("grupoLeon_notifications");
      const all = raw ? JSON.parse(raw) : [];
      const updated = all.filter((n) => n.id !== id);
      localStorage.setItem("grupoLeon_notifications", JSON.stringify(updated));
      window.dispatchEvent(new Event("localNotificationsUpdated"));
    } catch {}
  };

  const formatTimeAgo = (isoStr) => {
    if (!isoStr) return "Hace un momento";
    const diffMs = Date.now() - new Date(isoStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Justo ahora";
    if (diffMins < 60) return `Hace ${diffMins} min`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    return new Date(isoStr).toLocaleDateString();
  };

  const handleOpenQuote = (quoteObj, quoteId) => {
    let targetDoc = quoteObj;
    if (!targetDoc && quoteId) {
      const savedQuotes = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
      targetDoc = savedQuotes.find((q) => (q.id || q.docNumber) === quoteId);
    }
    if (!targetDoc) {
      targetDoc = {
        id: quoteId,
        docNumber: quoteId,
        clientName: "—",
        sellerName: username || "—",
        totals: { grandTotalUSD: 0 },
        state: "ENVIADO"
      };
    }
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
                      _hover={{ boxShadow: "md", transform: "translateY(-1px)" }}
                      transition="all 0.2s"
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
                              onClick={() => handleDeleteNotif(item.id)}
                              aria-label="Eliminar alerta"
                              flexShrink={0}
                              w={{ base: "40px", md: "auto" }}
                              h={{ base: "40px", md: "auto" }}
                            />
                          </Tooltip>
                        </Flex>

                        <HStack spacing={1} fontSize={{ base: "11px", md: "10px" }} color="gray.500">
                          <Icon as={FiClock} boxSize={3} />
                          <Text fontWeight="600">{formatTimeAgo(item.timestamp)}</Text>
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
                            colorScheme={isApproved ? "green" : isRejected ? "red" : "blue"}
                            leftIcon={<Icon as={FiEye} />}
                            onClick={() => handleOpenQuote(item.quoteObj, item.quoteId)}
                            fontWeight="800"
                            px={3}
                            boxShadow="xs"
                          >
                            ⚡ Ver Cotización
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
        onUpdateStatus={(quoteId, newStatus, reasonNote) => {
          const savedQuotes = JSON.parse(localStorage.getItem("grupoLeon_local_quotes") || "[]");
          const updated = savedQuotes.map((q) => {
            if ((q.id || q.docNumber) === quoteId) {
              const currentHistory = q.historyLog || [];
              return {
                ...q,
                approvalStatus: newStatus,
                state: newStatus,
                rejectionReason: newStatus === "RECHAZADO" ? reasonNote : q.rejectionReason,
                historyLog: [
                  ...currentHistory,
                  {
                    status: newStatus,
                    timestamp: new Date().toISOString(),
                    user: username || "Administrador",
                    note: reasonNote || `Cambio de estado a ${newStatus}`
                  }
                ]
              };
            }
            return q;
          });
          localStorage.setItem("grupoLeon_local_quotes", JSON.stringify(updated));
          window.dispatchEvent(new Event("localQuotesUpdated"));
        }}
      />
    </>
  );
}

export default NotificationDrawer;
