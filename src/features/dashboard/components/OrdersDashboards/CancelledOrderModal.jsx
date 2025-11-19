import { useState } from "react";
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  Box,
  Flex,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useColorModeValue,
  Spinner,
  VStack,
  HStack,
  Circle,
  Badge,
} from "@chakra-ui/react";
import { XCircle } from "lucide-react";

import { useGetCancelledOrderData } from "../../../reports/hooks/queries/reportQueries";

const CancelledOrderModal = ({ isOpen, onClose, order }) => {
  const bgMain = useColorModeValue("white", "gray.800");
  const bgSection = useColorModeValue("gray.50", "gray.700");
  const textMuted = useColorModeValue("gray.600", "gray.400");
  const textBase = useColorModeValue("gray.800", "white");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  // ⛔ Hook SIEMPRE debe ejecutarse
  const orderId = order?.orderNumber;
  console.log(orderId)

  const { data: cancelledData, isLoading } =
    useGetCancelledOrderData(orderId);

  // Si no hay order → después de hooks
  if (!order) return null;

  const ordenData = {
    id: order?.DocEntry,
    numero: order?.orderNumber || order?.DocNum,
    fechaCreacion:
      order?.orderDate ||
      (order?.DocDate
        ? new Date(order.DocDate + "T00:00:00").toLocaleDateString("es-ES")
        : ""),
    montoUsd: order?.DocTotalUSD || 0,
  };

  const clienteData = {
    nombre: order?.clientName || order?.CardName || "",
    codigo: order?.CardCode || "",
  };

  const productos = (cancelledData || []).map((item) => ({
    codigo: item.ItemCode,
    descripcion: item.Description,
    cantidadOrdenada: item.RequestedQty,
    cantidadPendiente: item.RequestedQty,
  }));

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent>
        <ModalHeader borderBottom="1px" borderColor={borderColor}>
          <HStack spacing={3}>
            <Circle size="40px" bg="red.500" color="white">
              <XCircle size={20} />
            </Circle>
            <VStack align="start" spacing={0}>
              <Text fontSize="lg" fontWeight="bold">
                Pedido Cancelado
              </Text>
              <Text fontSize="sm" color={textMuted}>
                Detalles del pedido #{ordenData.numero}
              </Text>
            </VStack>
          </HStack>
        </ModalHeader>

        <ModalCloseButton />

        <ModalBody py={6}>
          <VStack spacing={6} align="stretch">
            {/* Datos Orden */}
            <Box
              bg={bgSection}
              p={4}
              borderRadius="md"
              borderWidth="1px"
              borderColor={borderColor}
            >
              <VStack align="stretch" spacing={3}>
                <HStack justify="space-between">
                  <Text fontSize="sm" color={textMuted}>
                    Pedido:
                  </Text>
                  <Badge colorScheme="blue" fontSize="md" px={3} py={1}>
                    #{ordenData.numero}
                  </Badge>
                </HStack>

                <HStack justify="space-between">
                  <Text fontSize="sm" color={textMuted}>
                    Cliente:
                  </Text>
                  <Text fontSize="sm" fontWeight="bold">
                    {clienteData.nombre}
                  </Text>
                </HStack>

                {clienteData.codigo && (
                  <HStack justify="space-between">
                    <Text fontSize="sm" color={textMuted}>
                      Código Cliente:
                    </Text>
                    <Text fontSize="sm" fontWeight="medium">
                      {clienteData.codigo}
                    </Text>
                  </HStack>
                )}

                <HStack justify="space-between">
                  <Text fontSize="sm" color={textMuted}>
                    Fecha:
                  </Text>
                  <Text fontSize="sm" fontWeight="medium">
                    {ordenData.fechaCreacion}
                  </Text>
                </HStack>

                {order?.cancellationReason && (
                  <Box pt={2} borderTop="1px" borderColor={borderColor}>
                    <Text fontSize="sm" color={textMuted} mb={1}>
                      Motivo de cancelación:
                    </Text>
                    <Badge colorScheme="red" fontSize="sm" px={2} py={1}>
                      {order.cancellationReason}
                    </Badge>
                  </Box>
                )}
              </VStack>
            </Box>

            {/* Productos */}
            <Box>
              <Text fontWeight="bold" fontSize="md" mb={3} color="red.600">
                Productos cancelados
              </Text>

              {isLoading ? (
                <Flex
                  justify="center"
                  align="center"
                  py={10}
                  bg={bgSection}
                  borderRadius="md"
                >
                  <VStack spacing={3}>
                    <Spinner size="lg" color="red.500" />
                    <Text fontSize="sm" color={textMuted}>
                      Cargando productos…
                    </Text>
                  </VStack>
                </Flex>
              ) : productos.length === 0 ? (
                <Box
                  py={8}
                  textAlign="center"
                  bg={bgSection}
                  borderRadius="md"
                  borderWidth="1px"
                  borderStyle="dashed"
                  borderColor={borderColor}
                >
                  <Text color={textMuted} fontSize="sm">
                    No se encontraron productos cancelados
                  </Text>
                </Box>
              ) : (
                <Box
                  borderWidth="1px"
                  borderColor={borderColor}
                  borderRadius="md"
                  overflow="hidden"
                >
                  <Table variant="simple" size="sm">
                    <Thead bg="red.500">
                      <Tr>
                        <Th color="white" fontSize="xs">
                          PRODUCTO
                        </Th>
                        <Th color="white" fontSize="xs" textAlign="center">
                          CANT. SOL.
                        </Th>
                        <Th color="white" fontSize="xs" textAlign="center">
                          CANT. PEND.
                        </Th>
                      </Tr>
                    </Thead>

                    <Tbody>
                      {productos.map((prod, idx) => (
                        <Tr
                          key={idx}
                          bg={idx % 2 === 0 ? bgMain : bgSection}
                        >
                          <Td color={textBase}>
                            <VStack align="start" spacing={0}>
                              <Text fontSize="sm" fontWeight="medium">
                                {prod.descripcion}
                              </Text>
                              <Text fontSize="xs" color={textMuted}>
                                Código: {prod.codigo}
                              </Text>
                            </VStack>
                          </Td>
                          <Td textAlign="center" fontWeight="bold">
                            {prod.cantidadOrdenada}
                          </Td>
                          <Td textAlign="center">
                            <Badge colorScheme="red" fontSize="sm">
                              {prod.cantidadPendiente}
                            </Badge>
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </Box>
              )}
            </Box>

            {ordenData.montoUsd > 0 && (
              <Box
                bg={bgSection}
                p={4}
                borderRadius="md"
                borderWidth="1px"
                borderColor={borderColor}
              >
                <HStack justify="space-between">
                  <Text fontSize="sm" color={textMuted}>
                    Monto total:
                  </Text>
                  <Text fontSize="lg" fontWeight="bold" color="red.600">
                    ${ordenData.montoUsd.toFixed(2)} USD
                  </Text>
                </HStack>
              </Box>
            )}
          </VStack>
        </ModalBody>
      </ModalContent>
    </Modal>
  );
};

export default CancelledOrderModal;
