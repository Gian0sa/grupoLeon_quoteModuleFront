import { Box, Text, VStack, HStack, Icon } from "@chakra-ui/react";
import { FiInfo, FiAlertTriangle, FiBell } from "react-icons/fi";

const typeStyles = {
  info: { color: "blue.400", icon: FiInfo },
  warn: { color: "yellow.400", icon: FiAlertTriangle },
  alert: { color: "red.400", icon: FiBell },
};

export function Notifications({ data }) {
  return (
    <Box>
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Notificaciones
      </Text>

      {/* ✅ Sección con altura fija y scroll interno */}
      <Box
        maxH="300px"      // Altura máxima definida
        overflowY="auto"  // Scroll vertical solo en esta sección
        pr={2}            // Padding derecho para que no se superponga con el scroll
      >
        <VStack spacing={3} align="stretch">
          {data?.length > 0 ? (
            data.map((notification) => {
              const style = typeStyles[notification.type] || typeStyles.info;

              return (
                <Box
                  key={notification.id}
                  p={4}
                  borderRadius="lg"
                  borderLeft="4px solid"
                  borderLeftColor={style.color}
                  shadow="sm"
                >
                  <HStack justify="space-between" align="flex-start">
                    <HStack align="flex-start">
                      <Icon as={style.icon} color={style.color} boxSize={5} />
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="semibold">{notification.title}</Text>
                        <Text fontSize="sm" color="gray.600">
                          {notification.message}
                        </Text>
                        <Text fontSize="xs" color="gray.400">
                          {new Date(notification.createdAt).toLocaleString()}
                        </Text>
                      </VStack>
                    </HStack>
                  </HStack>
                </Box>
              );
            })
          ) : (
            <Text fontSize="sm" color="gray.500">
              No hay notificaciones disponibles
            </Text>
          )}
        </VStack>
      </Box>
    </Box>
  );
}
