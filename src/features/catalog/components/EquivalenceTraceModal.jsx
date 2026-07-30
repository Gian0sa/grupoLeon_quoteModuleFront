import {
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalCloseButton, ModalBody,
  Box, Flex, VStack, HStack, Text, Badge, Alert, AlertIcon, Skeleton
} from '@chakra-ui/react';

function TraceHeader({ traceResult }) {
  return (
    <Flex bg="white" borderWidth="1px" borderRadius="xl" p={5} align="center" justify="space-between" shadow="sm" borderColor="gray.200">
      <Box flex="1" textAlign="center">
        <Badge colorScheme="blue" mb={2}>ORIGEN</Badge>
        <Text color="gray.800" fontFamily="mono" fontWeight="bold" fontSize="lg">
          {traceResult.productA.codigo}
        </Text>
        <Text fontSize="xs" color="gray.500" mt={1} bg="gray.50" display="inline-block" px={2} py={0.5} borderRadius="md" border="1px solid" borderColor="gray.200">
          OEM: {traceResult.productA.oem || 'N/A'}
        </Text>
      </Box>
      <Box flexShrink={0} px={4} color="green.500" fontSize="2xl">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"/>
        </svg>
      </Box>
      <Box flex="1" textAlign="center">
        <Badge colorScheme="green" mb={2}>EQUIVALENCIA</Badge>
        <Text color="gray.800" fontFamily="mono" fontWeight="bold" fontSize="lg">
          {traceResult.productB.codigo}
        </Text>
        <Text fontSize="xs" color="gray.500" mt={1} bg="gray.50" display="inline-block" px={2} py={0.5} borderRadius="md" border="1px solid" borderColor="gray.200">
          OEM: {traceResult.productB.oem || 'N/A'}
        </Text>
      </Box>
    </Flex>
  );
}

function TraceNodeMeta({ node }) {
  return (
    <VStack align="end" spacing={1} flexShrink={0}>
      {node.fabricante && <Badge bg="gray.100" color="gray.600" fontWeight="normal" fontSize="10px">{node.fabricante}</Badge>}
      {node.tipo && <Badge bg="gray.100" color="gray.600" fontWeight="normal" fontSize="10px">{node.tipo}</Badge>}
      {node.categoria && <Badge bg="gray.100" color="gray.600" fontWeight="normal" fontSize="10px">{node.categoria}</Badge>}
    </VStack>
  );
}

function TracePath({ traceResult }) {
  if (!traceResult.connected) {
    return (
      <Alert status="error" borderRadius="xl" fontSize="sm">
        <AlertIcon />
        No se encontró conexión directa en la base de datos de equivalencias. Los productos pueden estar
        listados por una búsqueda profunda textual u otras relaciones no jerárquicas.
      </Alert>
    );
  }

  return (
    <Box position="relative" pl={8} borderLeftWidth="2px" borderColor="green.200" ml={2} py={2}>
      <Box position="relative" mb={8}>
        <Flex
          position="absolute" left="-41px" top="1" h={6} w={6} align="center" justify="center"
          borderRadius="full" bg="green.600" color="white" fontSize="10px" fontWeight="bold"
          boxShadow="0 0 0 4px white"
        >
          A
        </Flex>
        <Flex borderWidth="1px" borderRadius="lg" p={3} shadow="sm" justify="space-between" align="start" gap={4}>
          <Box flex="1">
            <Text fontWeight="bold" fontSize="sm" color="gray.800">{traceResult.productA.codigo}</Text>
            <Text fontSize="xs" color="gray.500" fontFamily="mono" mt={1}>OEM Base: {traceResult.productA.oem || 'N/A'}</Text>
            {traceResult.productA.documentoOrigen && (
              <Text fontSize="11px" fontWeight="medium" color="green.700" mt={1}>
                Origen: {traceResult.productA.documentoOrigen}
              </Text>
            )}
          </Box>
          <TraceNodeMeta node={traceResult.productA} />
        </Flex>
      </Box>

      {traceResult.path.map((step, idx) => {
        const isOemMatch = step.reason?.toLowerCase().includes('oem');
        return (
          <Box key={idx} position="relative" mb={8}>
            <Flex
              position="absolute" left="-41px" top="1" h={6} w={6} align="center" justify="center"
              borderRadius="full" bg="gray.200" color="gray.600" fontSize="10px" fontWeight="bold"
              boxShadow="0 0 0 4px white"
            >
              {idx + 1}
            </Flex>
            <HStack fontSize="xs" fontWeight="medium" color="gray.600" bg="gray.100" borderWidth="1px" px={2.5} py={1} borderRadius="full" display="inline-flex" mb={2}>
              <Text as="span">
                {isOemMatch ? 'Coincidencia OEM' : 'Relación Directa'}
                {step.typeEquiv ? ` (${step.typeEquiv})` : ''}
                {!isOemMatch && step.idRelacion ? ` - ID: ${step.idRelacion}` : ''}
              </Text>
            </HStack>
            <Flex borderWidth="1px" borderRadius="lg" p={3} shadow="sm" justify="space-between" align="start" gap={4}>
              <Box flex="1">
                <Text fontWeight="bold" fontSize="sm" color="gray.800">{step.codigo}</Text>
                <Text fontSize="xs" color="gray.500" fontFamily="mono" mt={1}>OEM: {step.oem || 'N/A'}</Text>
                {step.documentoOrigen && (
                  <Text fontSize="11px" fontWeight="medium" color="green.700" mt={1}>
                    Origen: {step.documentoOrigen}
                  </Text>
                )}
              </Box>
              <VStack align="end" spacing={1} flexShrink={0}>
                {isOemMatch && (
                  <Badge colorScheme="orange" fontSize="10px" textTransform="uppercase" letterSpacing="wider">
                    Link OEM
                  </Badge>
                )}
                <TraceNodeMeta node={step} />
              </VStack>
            </Flex>
          </Box>
        );
      })}
    </Box>
  );
}

export default function EquivalenceTraceModal({ isOpen, onClose, traceLoading, traceResult }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" isCentered scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Detalle de Seguimiento de Equivalencia</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          {traceLoading ? (
            <VStack spacing={3} py={6} align="stretch">
              <Skeleton height="16px" width="75%" />
              <Skeleton height="40px" />
              <Skeleton height="16px" width="50%" />
            </VStack>
          ) : traceResult ? (
            <VStack spacing={6} align="stretch">
              <TraceHeader traceResult={traceResult} />
              <Box>
                <Text fontSize="sm" fontWeight="semibold" color="gray.700" mb={3}>
                  Ruta de Equivalencia
                </Text>
                <TracePath traceResult={traceResult} />
              </Box>
            </VStack>
          ) : (
            <Box textAlign="center" py={8} color="gray.500" fontSize="sm" bg="gray.50" borderRadius="xl" borderWidth="1px">
              No se pudo cargar la información de trazabilidad.
            </Box>
          )}
        </ModalBody>
      </ModalContent>
    </Modal>
  );
}
