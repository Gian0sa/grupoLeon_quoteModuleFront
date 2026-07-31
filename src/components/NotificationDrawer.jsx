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
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="sm">
      <DrawerOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <DrawerContent borderLeftRadius={{ base: "none", md: "2xl" }}>
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

        <DrawerBody p={4} bg="gray.50">
          {isLoading ? (
            <Flex justify="center" align="center" h="200px">
              <Spinner color="green.600" size="lg" />
            </Flex>
          ) : error ? (
            <Box p={4} bg="red.50" borderRadius="xl" border="1px solid" borderColor="red.200">
              <Text color="red.600" fontSize="sm" fontWeight="600">
                Error al cargar las notificaciones.
              </Text>
            </Box>
          ) : notifications?.length > 0 ? (
            <VStack spacing={3} align="stretch">
              {notifications.map((notification) => {
                const style = typeStyles[notification.type] || typeStyles.info;
                const IconComponent = style.icon;

                return (
                  <Box
                    key={notification.id}
                    p={4}
                    bg="white"
                    borderRadius="xl"
                    boxShadow="0 2px 10px rgba(0,0,0,0.03)"
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <HStack align="flex-start" spacing={3}>
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
                        <Icon as={IconComponent} color={style.color} boxSize={4} />
                      </Flex>
                      <VStack align="start" spacing={1} flex={1}>
                        <Text fontWeight="700" color="gray.800" fontSize="sm">
                          {notification.title}
                        </Text>
                        <Text fontSize="xs" color="gray.600">
                          {notification.message}
                        </Text>
                        <Text fontSize="10px" color="gray.400" mt={1}>
                          {new Date(notification.createdAt).toLocaleString()}
                        </Text>
                      </VStack>
                    </HStack>
                  </Box>
                );
              })}
            </VStack>
          ) : (
            <Flex
              direction="column"
              align="center"
              justify="center"
              h="260px"
              bg="white"
              p={6}
              borderRadius="2xl"
              border="1.5px dashed"
              borderColor="gray.200"
              textAlign="center"
              mt={4}
            >
              <Flex
                w="52px"
                h="52px"
                borderRadius="full"
                bg="green.50"
                align="center"
                justify="center"
                mb={3}
              >
                <Icon as={FiCheckCircle} boxSize={6} color="green.600" />
              </Flex>
              <Text fontSize="sm" fontWeight="700" color="gray.700" mb={1}>
                ¡Estás al día!
              </Text>
              <Text fontSize="xs" color="gray.500">
                No hay notificaciones disponibles por el momento.
              </Text>
            </Flex>
          )}
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
