// Notifications.jsx
import { Box, Text, VStack, HStack, Icon } from "@chakra-ui/react";
import { FiInfo, FiAlertTriangle, FiBell } from "react-icons/fi";

const typeStyles = {
  info: { color: "blue.400", icon: FiInfo },
  warn: { color: "yellow.400", icon: FiAlertTriangle },
  alert: { color: "red.400", icon: FiBell },
};

export function Notifications({ data }) {
  return (
    <Box mt={2}>
      <HStack spacing={2} mb={4} align="center">
        <Icon as={FiBell} boxSize={5} color="green.600" />
        <Text fontSize="lg" fontWeight="800" color="gray.800" letterSpacing="tight">
          Notificaciones
        </Text>
      </HStack>

      <Box
        maxH="300px"
        overflowY="auto"
        pr={2}
      >
        <VStack spacing={3} align="stretch">
          {data?.length > 0 ? (
            data.map((notification) => {
              const style = typeStyles[notification.type] || typeStyles.info;

              return (
                <Box
                  key={notification.id}
                  p={4}
                  borderRadius="2xl"
                  borderLeft="4px solid"
                  borderLeftColor={style.color}
                  boxShadow="0 4px 15px rgba(0,0,0,0.03)"
                  bg="white" 
                  border="1px solid rgba(0,0,0,0.05)"
                >
                  <HStack justify="space-between" align="flex-start">
                    <HStack align="flex-start" spacing={3}>
                      <Icon as={style.icon} color={style.color} boxSize={5} mt={0.5} />
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="semibold" color="gray.800" fontSize="sm">
                          {notification.title}
                        </Text>
                        <Text fontSize="sm" color="gray.600">
                          {notification.message}
                        </Text>
                        <Text fontSize="xs" color="gray.400" mt={1}>
                          {new Date(notification.createdAt).toLocaleString()}
                        </Text>
                      </VStack>
                    </HStack>
                  </HStack>
                </Box>
              );
            })
          ) : (
            <Box
              p={6}
              bg="white"
              borderRadius="2xl"
              border="1px border-dashed"
              borderColor="gray.200"
              textAlign="center"
              boxShadow="0 4px 12px rgba(0,0,0,0.02)"
            >
              <Text fontSize="sm" color="gray.500" fontWeight="medium">
                No hay notificaciones disponibles por el momento
              </Text>
            </Box>
          )}
        </VStack>
      </Box>
    </Box>
  );
}
