import React, { useState } from "react";
import {
  Box,
  Flex,
  Heading,
  Text,
  Input,
  Button,
  HStack,
  Wrap,
  WrapItem,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Icon,
  IconButton,
  InputGroup,
  InputLeftElement,
  Tooltip,
} from "@chakra-ui/react";
import { AddIcon, CloseIcon } from "@chakra-ui/icons";
import { MdLayers, MdQrCodeScanner, MdPlace } from "react-icons/md";

const ESTADO_PACKING = {
  ABIERTO: { color: "orange", texto: "ABIERTO · por confirmar" },
  CERRADO: { color: "green", texto: "EMBALAJE CONFIRMADO" },
  DESPACHADO: { color: "purple", texto: "DESPACHADO" },
};

/**
 * Guías que se embalan juntas (Packing): solo del mismo cliente y la misma dirección de entrega,
 * para no armar bultos que luego haya que desarmar. Permite escanear/agregar guías y ver sugerencias.
 */
export function GuiasPackingCard({
  deliveryData,
  packing,
  guiasEmbalaje,
  candidatasPacking,
  agregandoGuia,
  handleAgregarGuiaPacking,
  handleQuitarGuiaPacking,
}) {
  const [docNumAgregar, setDocNumAgregar] = useState("");
  const editable = deliveryData.estado !== "DESPACHADA" && packing?.estado !== "DESPACHADO";
  const estado = packing ? ESTADO_PACKING[packing.estado] : null;

  const agregar = async (valor) => {
    const ok = await handleAgregarGuiaPacking(valor);
    if (ok) setDocNumAgregar("");
  };

  return (
    <Card boxShadow="sm" borderRadius="2xl" bg="white">
      <CardHeader pb={2}>
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={2}>
          <HStack>
            <Icon as={MdLayers} color="green.600" w={5} h={5} />
            <Heading size="md" color="gray.800">
              Guías en este Packing ({guiasEmbalaje.length})
            </Heading>
          </HStack>
          <HStack spacing={2}>
            {packing && (
              <Badge colorScheme="gray" px={2} py={1} borderRadius="md">
                PACKING #{packing.id}
              </Badge>
            )}
            {estado && (
              <Badge colorScheme={estado.color} px={2} py={1} borderRadius="md">
                {estado.texto}
              </Badge>
            )}
          </HStack>
        </Flex>
        <HStack mt={2} spacing={1.5} color="gray.600" fontSize="xs" align="flex-start">
          <Icon as={MdPlace} mt="2px" />
          <Text>
            <b>{deliveryData.clienteNombre}</b> → {deliveryData.destinoMercaderia || "sin dirección de entrega"}
          </Text>
        </HStack>
      </CardHeader>

      <CardBody pt={1}>
        {/* Guías ya incluidas */}
        <Wrap spacing={2} mb={editable ? 4 : 0}>
          {guiasEmbalaje.map((g) => {
            const esActual = g.docNumEntrega === deliveryData.docNumEntrega;
            return (
              <WrapItem key={g.docNumEntrega}>
                <HStack
                  spacing={1}
                  pl={3}
                  pr={esActual || !editable ? 3 : 1}
                  py={1.5}
                  borderRadius="xl"
                  border="1.5px solid"
                  borderColor={esActual ? "green.400" : "blue.200"}
                  bg={esActual ? "green.50" : "blue.50"}
                >
                  <Text fontSize="sm" fontWeight="bold" color={esActual ? "green.800" : "blue.800"}>
                    Guía {g.numeroGuiaInterna || g.docNumEntrega}
                  </Text>
                  {g.codigoPedido && (
                    <Text fontSize="xs" color="gray.500">
                      · Pedido {g.codigoPedido}
                    </Text>
                  )}
                  {esActual && (
                    <Badge colorScheme="green" fontSize="9px" ml={1}>
                      ACTUAL
                    </Badge>
                  )}
                  {!esActual && editable && packing && (
                    <Tooltip label="Quitar del packing (sus productos salen de las cajas)">
                      <IconButton
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        icon={<CloseIcon boxSize="8px" />}
                        aria-label={`Quitar guía ${g.docNumEntrega}`}
                        isDisabled={agregandoGuia}
                        onClick={() => handleQuitarGuiaPacking(g.docNumEntrega)}
                      />
                    </Tooltip>
                  )}
                </HStack>
              </WrapItem>
            );
          })}
        </Wrap>

        {editable && (
          <>
            {/* Agregar otra guía: escanear con la pistola (Enter automático) o escribir y Enter */}
            <Flex gap={2} flexWrap="wrap">
              <InputGroup flex="1" minW="220px">
                <InputLeftElement pointerEvents="none">
                  <Icon as={MdQrCodeScanner} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Escanea o escribe otra guía del mismo cliente y dirección..."
                  value={docNumAgregar}
                  onChange={(e) => setDocNumAgregar(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      agregar(docNumAgregar);
                    }
                  }}
                  borderRadius="xl"
                  isDisabled={agregandoGuia}
                />
              </InputGroup>
              <Button
                leftIcon={<AddIcon boxSize="10px" />}
                colorScheme="blue"
                variant="outline"
                borderRadius="xl"
                isLoading={agregandoGuia}
                onClick={() => agregar(docNumAgregar)}
              >
                Agregar guía
              </Button>
            </Flex>
            <Text fontSize="xs" color="gray.500" mt={1.5}>
              Solo se juntan guías del <b>mismo cliente</b> y la <b>misma dirección de entrega</b>; una caja puede
              mezclar productos de esas guías.
            </Text>

            {/* Sugerencias: guías del mismo cliente y dirección con picking listo */}
            {candidatasPacking.length > 0 && (
              <Box mt={4} p={3} bg="yellow.50" border="1px dashed" borderColor="yellow.400" borderRadius="xl">
                <Text fontSize="sm" fontWeight="bold" color="yellow.800" mb={2}>
                  💡 {candidatasPacking.length} guía(s) más de este cliente van a la misma dirección y ya tienen picking:
                </Text>
                <Wrap spacing={2}>
                  {candidatasPacking.map((g) => (
                    <WrapItem key={g.docNumEntrega}>
                      <Button
                        size="sm"
                        leftIcon={<AddIcon boxSize="8px" />}
                        colorScheme="yellow"
                        variant="outline"
                        bg="white"
                        borderRadius="lg"
                        isDisabled={agregandoGuia}
                        onClick={() => agregar(g.docNumEntrega)}
                      >
                        Guía {g.numeroGuiaInterna || g.docNumEntrega}
                        {g.codigoPedido ? ` · Pedido ${g.codigoPedido}` : ""}
                      </Button>
                    </WrapItem>
                  ))}
                </Wrap>
              </Box>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
