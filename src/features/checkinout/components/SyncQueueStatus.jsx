import React, { useState } from "react";
import {
  Box,
  Card,
  CardBody,
  VStack,
  HStack,
  Text,
  Badge,
  Button,
  Flex,
  Heading,
  Icon,
  Collapse,
  IconButton,
  Tooltip,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
} from "@chakra-ui/react";
import { FiRefreshCw, FiTrash2, FiClock, FiAlertTriangle, FiChevronDown, FiChevronUp } from "react-icons/fi";

export default function SyncQueueStatus({ queueItems, onRetry, onDelete, onClearAll, isSyncing, onSyncAll }) {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteItemId, setDeleteItemId] = useState(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isClearAllAlertOpen, setIsClearAllAlertOpen] = useState(false);
  const cancelRef = React.useRef();

  const handleDeleteClick = (id) => {
    setDeleteItemId(id);
    setIsAlertOpen(true);
  };

  const handleClearAllClick = () => {
    setIsClearAllAlertOpen(true);
  };

  const handleConfirmClearAll = () => {
    if (onClearAll) {
      onClearAll();
    }
    setIsClearAllAlertOpen(false);
  };

  const handleConfirmDelete = () => {
    if (deleteItemId && onDelete) {
      onDelete(deleteItemId);
    }
    setIsAlertOpen(false);
    setDeleteItemId(null);
  };

  const handleCancelDelete = () => {
    setIsAlertOpen(false);
    setDeleteItemId(null);
  };

  if (!queueItems || queueItems.length === 0) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case "NEEDS_REVIEW":
      case "FAILED": return "red";
      case "SYNCING": return "blue";
      default: return "yellow";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "NEEDS_REVIEW":
      case "FAILED": return "Requiere revisión";
      case "SYNCING": return "Enviando";
      default: return "Pendiente de envío";
    }
  };

  const needsAttention = (status) => status === "NEEDS_REVIEW" || status === "FAILED";

  return (
    <>
      <Card 
      mx={0} 
      mt={4} 
      border="1px solid" 
      borderColor="orange.200" 
      bg="orange.50"
      boxShadow="sm"
      borderRadius="md"
    >
      <CardBody p={4}>
        <VStack align="stretch" spacing={3}>
          <Flex justify="space-between" align="center">
            <HStack spacing={3}>
              <Icon as={FiClock} color="orange.500" w={5} h={5} />
              <VStack align="start" spacing={0}>
                <Heading size="xs" color="orange.800" fontWeight="600">
                  Cola de Sincronización
                </Heading>
                <Text fontSize="2xs" color="orange.600">
                  {queueItems.length} operación{queueItems.length !== 1 ? 'es' : ''} pendiente{queueItems.length !== 1 ? 's' : ''}
                </Text>
              </VStack>
            </HStack>
            <HStack spacing={2}>
              {onClearAll && (
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="red"
                  onClick={handleClearAllClick}
                  isLoading={isSyncing}
                  leftIcon={<FiTrash2 />}
                  fontSize="2xs"
                  px={2}
                >
                  Limpiar Todo
                </Button>
              )}
              <Button
                size="xs"
                colorScheme="orange"
                onClick={onSyncAll}
                isLoading={isSyncing}
                leftIcon={<FiRefreshCw />}
                fontSize="2xs"
                px={3}
              >
                Sincronizar
              </Button>
              <IconButton
                size="xs"
                variant="ghost"
                color="orange.800"
                icon={isOpen ? <FiChevronUp /> : <FiChevronDown />}
                onClick={() => setIsOpen(!isOpen)}
                aria-label="Ver detalles"
              />
            </HStack>
          </Flex>

          <Collapse in={isOpen} animateOpacity>
            <VStack align="stretch" spacing={2} pt={2} borderTop="1px dashed" borderColor="orange.300">
              {queueItems.map((item) => (
                <Box
                  key={item.id}
                  p={3}
                  bg="white"
                  borderRadius="md"
                  border="1px solid"
                  borderColor={needsAttention(item.status) ? "red.100" : "gray.100"}
                  fontSize="xs"
                  boxShadow="2xs"
                >
                  <Flex justify="space-between" align="start">
                    <VStack align="start" spacing={1} flex={1} mr={2}>
                      <HStack wrap="wrap">
                        <Badge colorScheme={item.type === "IN" ? "green" : "red"} fontSize="2xs" px={1.5} py={0.5} borderRadius="sm">
                          {item.type === "IN" ? "CHECK IN" : "CHECK OUT"}
                        </Badge>
                        <Text fontWeight="600" color="gray.700" fontSize="xs">
                          {item.storeName}
                        </Text>
                      </HStack>
                      <Text color="gray.500" fontSize="2xs">
                        {new Date(item._queuedAt).toLocaleString()}
                      </Text>
                      {item.errorMessage && (
                        <HStack spacing={1} mt={1} color="red.600" align="start">
                          <Icon as={FiAlertTriangle} w={3.5} h={3.5} mt={0.5} />
                          <Text fontSize="2xs" fontWeight="500">
                            {item.errorMessage}
                          </Text>
                        </HStack>
                      )}
                    </VStack>

                    <HStack spacing={1} align="center">
                      <Badge colorScheme={getStatusColor(item.status)} fontSize="2xs" px={1.5} borderRadius="sm">
                        {getStatusLabel(item.status)}
                      </Badge>
                      {needsAttention(item.status) && (
                        <Tooltip label="Reintentar envío">
                          <IconButton
                            size="sm"
                            minH="40px"
                            minW="40px"
                            icon={<FiRefreshCw />}
                            colorScheme="blue"
                            variant="ghost"
                            onClick={() => onRetry(item.id)}
                            aria-label="Reintentar item"
                          />
                        </Tooltip>
                      )}
                      {/* Check-In items cannot be deleted to prevent state corruption */}
                      {item.type !== "IN" && (
                        <Tooltip label="Eliminar">
                          <IconButton
                            size="xs"
                            icon={<FiTrash2 />}
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => handleDeleteClick(item.id)}
                            aria-label="Eliminar item"
                          />
                        </Tooltip>
                      )}
                    </HStack>
                  </Flex>
                </Box>
              ))}
            </VStack>
          </Collapse>
        </VStack>
      </CardBody>
    </Card>

      <AlertDialog
        isOpen={isAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={handleCancelDelete}
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Eliminar registro local
            </AlertDialogHeader>

            <AlertDialogBody>
              ¿Está seguro de eliminar este registro local? Esta acción no se puede deshacer y el registro no será enviado al servidor.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={handleCancelDelete} size="sm">
                Cancelar
              </Button>
              <Button colorScheme="red" onClick={handleConfirmDelete} ml={3} size="sm">
                Eliminar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>

      <AlertDialog
        isOpen={isClearAllAlertOpen}
        leastDestructiveRef={cancelRef}
        onClose={() => setIsClearAllAlertOpen(false)}
      >
        <AlertDialogOverlay>
          <AlertDialogContent mx={4}>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Limpiar cola de sincronización
            </AlertDialogHeader>

            <AlertDialogBody>
              ¿Está seguro de vaciar toda la cola local? Todos los registros pendientes de prueba u obsoletos serán eliminados de la memoria local.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={() => setIsClearAllAlertOpen(false)} size="sm">
                Cancelar
              </Button>
              <Button colorScheme="red" onClick={handleConfirmClearAll} ml={3} size="sm">
                Limpiar Todo
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}
