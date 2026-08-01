import React from "react";
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
  Spinner,
  Flex
} from "@chakra-ui/react";
import { FiBell, FiInfo, FiAlertTriangle, FiCheckCircle } from "react-icons/fi";
import { useNotifications } from "../features/dashboard/hooks/queries/dashboardQueries";

const typeStyles = {
  info: { color: "blue.500", bg: "blue.50", icon: FiInfo },
  warn: { color: "orange.500", bg: "orange.50", icon: FiAlertTriangle },
  alert: { color: "red.500", bg: "red.50", icon: FiBell },
};

export function NotificationDrawer({ isOpen, onClose }) {
  const { data: notifications, isLoading, error } = useNotifications();

  return (
    <Drawer
      isOpen={isOpen}
      placement="right"
      onClose={onClose}
      size="sm"
      blockScrollOnMount={true}
      preserveScrollBarGap={false}
      autoFocus={false}
    >
      <DrawerOverlay bg="blackAlpha.600" transition="opacity 0.15s ease-out" />
      <DrawerContent
        borderLeftRadius={{ base: "none", md: "2xl" }}
        style={{ willChange: "transform", transform: "translateZ(0)" }}
      >
        <DrawerCloseButton mt={2} />
        <DrawerHeader borderBottom="1px solid" borderColor="gray.100" pt={5} pb={4}>
          <HStack spacing={3}>
            <Flex
              w="38px"
              h="38px"
              borderRadius="xl"
              bg="green.50"
              align="center"
              justify="center"
            >
              <Icon as={FiBell} boxSize={5} color="green.600" />
            </Flex>
            <Box>
              <HStack spacing={2}>
                <Text fontSize="lg" fontWeight="800" color="gray.800">
                  Notificaciones
                </Text>
                {notifications?.length > 0 && (
                  <Badge colorScheme="green" borderRadius="full" px={2} py={0.5} fontSize="xs">
                    {notifications.length}
                  </Badge>
                )}
              </HStack>
              <Text fontSize="xs" color="gray.500" fontWeight="normal">
                Avisos y novedades del sistema
              </Text>
            </Box>
          </HStack>
        </DrawerHeader>

        <DrawerBody px={4} py={4}>
          {isLoading && (
            <Flex justify="center" align="center" py={12}>
              <Spinner color="green.600" size="lg" />
            </Flex>
          )}

          {error && (
            <Box textStyle="xs" color="red.500" textAlign="center" py={6}>
              No se pudieron cargar las notificaciones.
            </Box>
          )}

          {!isLoading && !error && notifications?.length === 0 && (
            <Flex direction="column" align="center" justify="center" py={12} color="gray.400">
              <Icon as={FiCheckCircle} boxSize={10} mb={2} />
              <Text fontSize="sm" fontWeight="600">
                No tienes notificaciones pendientes
              </Text>
            </Flex>
          )}

          {!isLoading && !error && notifications?.length > 0 && (
            <VStack spacing={3} align="stretch">
              {notifications.map((item) => {
                const style = typeStyles[item.type] || typeStyles.info;
                const ItemIcon = style.icon;

                return (
                  <Box
                    key={item.id}
                    p={3.5}
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="gray.100"
                    bg="gray.50"
                    _hover={{ bg: "white", borderColor: "green.200" }}
                    transition="all 0.2s"
                  >
                    <HStack spacing={3} align="start">
                      <Flex
                        w="32px"
                        h="32px"
                        borderRadius="lg"
                        bg={style.bg}
                        align="center"
                        justify="center"
                        flexShrink={0}
                        mt={0.5}
                      >
                        <Icon as={ItemIcon} boxSize={4} color={style.color} />
                      </Flex>
                      <Box flex={1}>
                        <Flex justify="space-between" align="center" mb={1}>
                          <Text fontSize="xs" fontWeight="800" color="gray.800">
                            {item.title}
                          </Text>
                          {item.date && (
                            <Text fontSize="10px" color="gray.400">
                              {item.date}
                            </Text>
                          )}
                        </Flex>
                        <Text fontSize="xs" color="gray.600" lineHeight="1.4">
                          {item.message}
                        </Text>
                      </Box>
                    </HStack>
                  </Box>
                );
              })}
            </VStack>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
