import React from "react";
import {
  Skeleton,
  Box,
  Stack,
  Text,
  Button,
  VStack,
  HStack,
  Badge,
  Flex,
  Icon,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { useQuoteStore } from "../../quotes/stores/quoteStore";
import { useGetRequestQuotes } from "../../supervisor/hooks/queries/supervisorQueries";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import { MdAssignmentTurnedIn, MdVisibility } from "react-icons/md";

export function Requests() {
  const { data: Quotes, isLoading: quotesLoading, error: quotesError } = useGetRequestQuotes();
  const setQuoteId = useQuoteStore((state) => state.setQuoteId);
  const navigate = useNavigate();

  const quotesList = Array.isArray(Quotes)
    ? Quotes
    : Array.isArray(Quotes?.data)
    ? Quotes.data
    : [];

  return (
    <Box w="full" minH="100vh" bg="gray.50" pb="80px">
      <TopHeaderBanner
        title="Solicitudes de Cotización"
        subtitle="Listado y revisión de solicitudes de cotización recibidas"
        showBack={true}
        backTo="/dashboard"
        mb={6}
      />

      <Box maxW="1100px" mx="auto" px={{ base: 4, md: 6 }} mt={-6}>
        {quotesLoading ? (
          <Stack spacing={4}>
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} height="90px" borderRadius="xl" />
            ))}
          </Stack>
        ) : quotesError ? (
          <Box
            p={6}
            bg="red.50"
            border="1px solid"
            borderColor="red.200"
            borderRadius="xl"
            color="red.700"
          >
            <Text fontWeight="600">Error al cargar las solicitudes:</Text>
            <Text fontSize="sm">{quotesError.message || "Error desconocido del servidor"}</Text>
          </Box>
        ) : quotesList.length === 0 ? (
          <Box
            p={10}
            bg="white"
            borderRadius="2xl"
            border="1px solid"
            borderColor="gray.100"
            boxShadow="sm"
            textAlign="center"
          >
            <Flex
              w="64px"
              h="64px"
              borderRadius="full"
              bg="green.50"
              color="green.600"
              align="center"
              justify="center"
              mx="auto"
              mb={3}
            >
              <Icon as={MdAssignmentTurnedIn} boxSize={8} />
            </Flex>
            <Text fontSize="lg" fontWeight="700" color="gray.800" mb={1}>
              No hay solicitudes pendientes
            </Text>
            <Text fontSize="sm" color="gray.500">
              Actualmente no existen solicitudes de cotización para revisar.
            </Text>
          </Box>
        ) : (
          <Stack spacing={4}>
            {quotesList.map((item) => (
              <Box
                key={item.id}
                p={5}
                bg="white"
                borderWidth="1px"
                borderColor="gray.200"
                borderRadius="xl"
                boxShadow="sm"
                transition="all 0.15s ease"
                _hover={{
                  borderColor: "green.400",
                  boxShadow: "md",
                  transform: "translateY(-1px)",
                }}
              >
                <Flex
                  direction={{ base: "column", sm: "row" }}
                  justify="space-between"
                  align={{ base: "start", sm: "center" }}
                  gap={3}
                >
                  <VStack align="start" spacing={1}>
                    <HStack spacing={2}>
                      <Badge colorScheme="green" px={2} py={0.5} borderRadius="md" fontSize="xs">
                        {item.docNumber ? `Cotización #${item.docNumber}` : `ID: ${item.id}`}
                      </Badge>
                      {item.state && (
                        <Badge colorScheme="blue" px={2} py={0.5} borderRadius="md" fontSize="xs">
                          {item.state}
                        </Badge>
                      )}
                    </HStack>
                    <Text fontWeight="700" fontSize="16px" color="gray.800">
                      {item.clientName || item.clientId || "Cliente sin nombre"}
                    </Text>
                    {item.clientDocument && (
                      <Text fontSize="xs" color="gray.500">
                        Documento: {item.clientDocument}
                      </Text>
                    )}
                    {item.sellerName && (
                      <Text fontSize="xs" color="gray.500">
                        Vendedor: {item.sellerName}
                      </Text>
                    )}
                  </VStack>

                  <Button
                    colorScheme="green"
                    bg="#126C36"
                    _hover={{ bg: "#0e572b" }}
                    leftIcon={<Icon as={MdVisibility} />}
                    size="sm"
                    borderRadius="lg"
                    px={4}
                    onClick={() => {
                      setQuoteId(item.id);
                      navigate(`/detailRequests`);
                    }}
                  >
                    Ver detalles
                  </Button>
                </Flex>
              </Box>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
