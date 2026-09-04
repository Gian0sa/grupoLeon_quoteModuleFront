import React, { useState } from "react";
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
  Button,
  Grid,
  Input,
  Badge,
  VStack,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableContainer,
  IconButton,
  useToast,
  Spinner,
} from "@chakra-ui/react";
import { Tag, Trash2, Plus, Sparkles, AlertCircle, Search, Percent } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetPromotions } from "../hooks/queries/quotesQueries";
import { savePromotion, deletePromotion } from "../services/promotionService";
import ItemAutocomplete from "./ItemAutocomplete";

export function ProductPromotionsModal({ isOpen, onClose }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { promotions, isLoading, refetch } = useGetPromotions();

  const [selectedItem, setSelectedItem] = useState(null);
  const [discountPct, setDiscountPct] = useState("3");
  const [campaignName, setCampaignName] = useState("Oferta del Mes");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingCode, setDeletingCode] = useState(null);

  const handleSelectItem = (item) => {
    setSelectedItem(item);
  };

  const handleSave = async () => {
    if (!selectedItem) {
      toast({
        title: "Seleccione un producto",
        description: "Busque y seleccione un producto de la lista para aplicarle la oferta.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const pctNum = parseFloat(discountPct);
    if (isNaN(pctNum) || pctNum <= 0 || pctNum > 50) {
      toast({
        title: "Porcentaje no válido",
        description: "El porcentaje de descuento promocional debe estar entre 0.1% y 50%.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSaving(true);
    try {
      const code = selectedItem.id || selectedItem.productCode || selectedItem.code || selectedItem.itemCode;
      const name = selectedItem.name || selectedItem.productName || selectedItem.description;

      await savePromotion({
        productCode: code,
        productName: name,
        discountPct: pctNum,
        campaignName: campaignName.trim() || "Oferta del Mes",
      });

      queryClient.invalidateQueries(["productPromotions"]);
      await refetch();

      toast({
        title: "🏷️ ¡Oferta Registrada!",
        description: `${name || code} ahora tiene un ${pctNum}% de descuento promocional.`,
        status: "success",
        duration: 3500,
        isClosable: true,
      });

      setSelectedItem(null);
      setDiscountPct("3");
    } catch (error) {
      toast({
        title: "Error al guardar",
        description: error.message || "No se pudo registrar la oferta.",
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (code) => {
    setDeletingCode(code);
    try {
      await deletePromotion(code);
      queryClient.invalidateQueries(["productPromotions"]);
      await refetch();
      toast({
        title: "Oferta retirada",
        description: `Se retiró el descuento promocional del artículo ${code}.`,
        status: "info",
        duration: 3000,
        isClosable: true,
      });
    } catch (error) {
      toast({
        title: "Error al retirar",
        description: error.message || "No se pudo eliminar la promoción.",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setDeletingCode(null);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl" motionPreset="slideInBottom">
      <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
      <ModalContent borderRadius="2xl" overflow="hidden" border="1px solid" borderColor="gray.200" maxW="750px">
        <ModalHeader bg="#0f2e22" color="white" py={4} px={5}>
          <Flex align="center" justify="space-between">
            <HStack spacing={3}>
              <Flex w="36px" h="36px" borderRadius="xl" bg="amber.500" align="center" justify="center" color="white" boxShadow="sm">
                <Tag className="w-5 h-5" />
              </Flex>
              <Box>
                <Text fontSize="md" fontWeight="900" lineHeight="1.2">
                  Gestor de Ofertas del Mes y Promociones
                </Text>
                <Text fontSize="11px" color="amber.200" fontWeight="600">
                  Asigna descuentos estilo supermercado a productos específicos (Se graban a SAP)
                </Text>
              </Box>
            </HStack>
            <ModalCloseButton color="white" position="static" />
          </Flex>
        </ModalHeader>

        <ModalBody p={5} bg="gray.50">
          <VStack align="stretch" spacing={5}>
            {/* Panel de Asignación de Oferta */}
            <Box bg="white" p={4} borderRadius="xl" border="1.5px solid" borderColor="amber.200" boxShadow="xs">
              <Text fontSize="xs" fontWeight="900" color="gray.800" textTransform="uppercase" letterSpacing="wider" mb={3}>
                ✨ Asignar Nueva Oferta / Descuento Promocional:
              </Text>

              <VStack align="stretch" spacing={3}>
                <Box>
                  <Text fontSize="11px" fontWeight="700" color="gray.600" mb={1}>
                    1. Buscar Artículo en Catálogo SAP:
                  </Text>
                  <ItemAutocomplete onSelect={handleSelectItem} placeholder="Escribe código o nombre del artículo..." />
                  {selectedItem && (
                    <Box mt={2} p={2.5} bg="emerald.50" border="1px solid" borderColor="emerald.200" borderRadius="lg">
                      <Flex justify="space-between" align="center">
                        <Box>
                          <Text fontSize="xs" fontWeight="800" color="emerald.900">
                            {selectedItem.name}
                          </Text>
                          <Text fontSize="10px" color="emerald.700" fontWeight="600">
                            Código: {selectedItem.id || selectedItem.productCode} • Precio Lista: ${Number(selectedItem.price || 0).toFixed(2)} USD
                          </Text>
                        </Box>
                        <Button size="xs" variant="ghost" colorScheme="red" onClick={() => setSelectedItem(null)}>
                          Cambiar
                        </Button>
                      </Flex>
                    </Box>
                  )}
                </Box>

                <Grid templateColumns={{ base: "1fr", sm: "1fr 1fr" }} gap={3}>
                  <Box>
                    <Text fontSize="11px" fontWeight="700" color="gray.600" mb={1}>
                      2. % Descuento Promocional:
                    </Text>
                    <HStack spacing={1.5}>
                      <Input
                        size="sm"
                        borderRadius="lg"
                        fontWeight="900"
                        fontSize="md"
                        textAlign="center"
                        value={discountPct}
                        onChange={(e) => setDiscountPct(e.target.value.replace(/[^0-9.]/g, ""))}
                        placeholder="3"
                        maxW="80px"
                        borderColor="amber.400"
                        bg="amber.50"
                      />
                      <HStack spacing={1}>
                        {["3", "5", "8", "10"].map((pct) => (
                          <Button
                            key={pct}
                            size="xs"
                            variant={discountPct === pct ? "solid" : "outline"}
                            colorScheme="amber"
                            bg={discountPct === pct ? "amber.500" : "white"}
                            color={discountPct === pct ? "white" : "amber.800"}
                            onClick={() => setDiscountPct(pct)}
                            borderRadius="md"
                            fontWeight="800"
                          >
                            {pct}%
                          </Button>
                        ))}
                      </HStack>
                    </HStack>
                  </Box>

                  <Box>
                    <Text fontSize="11px" fontWeight="700" color="gray.600" mb={1}>
                      3. Nombre de Campaña:
                    </Text>
                    <Input
                      size="sm"
                      borderRadius="lg"
                      fontWeight="700"
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                      placeholder="Oferta del Mes"
                      borderColor="gray.300"
                    />
                  </Box>
                </Grid>

                <Button
                  size="sm"
                  bg="#126C36"
                  color="white"
                  _hover={{ bg: "#0e572b" }}
                  onClick={handleSave}
                  isLoading={isSaving}
                  leftIcon={<Plus className="w-4 h-4" />}
                  fontWeight="900"
                  borderRadius="lg"
                  boxShadow="sm"
                  mt={1}
                >
                  Guardar Oferta Promocional
                </Button>
              </VStack>
            </Box>

            {/* Listado de Ofertas Activas */}
            <Box bg="white" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200" boxShadow="xs">
              <Flex justify="space-between" align="center" mb={2.5}>
                <HStack spacing={2}>
                  <Tag className="w-4 h-4 text-amber-600" />
                  <Text fontSize="xs" fontWeight="900" color="gray.800" textTransform="uppercase" letterSpacing="wider">
                    Ofertas Activas Actualmente ({promotions.length})
                  </Text>
                </HStack>
                {isLoading && <Spinner size="xs" color="emerald.600" />}
              </Flex>

              {promotions.length === 0 ? (
                <Box p={6} textAlign="center" color="gray.500">
                  <Tag className="w-8 h-8 opacity-30 text-gray-400 mx-auto mb-2" />
                  <Text fontSize="xs" fontWeight="700">No hay productos con oferta activa registrada.</Text>
                  <Text fontSize="11px" color="gray.400">Usa el formulario superior para añadir promociones mensuales.</Text>
                </Box>
              ) : (
                <TableContainer maxH="240px" overflowY="auto" borderRadius="lg" border="1px solid" borderColor="gray.100">
                  <Table size="sm" variant="simple">
                    <Thead bg="gray.100">
                      <Tr>
                        <Th fontSize="10px" fontWeight="800">Artículo</Th>
                        <Th fontSize="10px" fontWeight="800">Campaña</Th>
                        <Th fontSize="10px" fontWeight="800" textAlign="center">% Oferta</Th>
                        <Th fontSize="10px" fontWeight="800" textAlign="center">Acción</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {promotions.map((promo) => (
                        <Tr key={promo.id || promo.productCode} _hover={{ bg: "amber.50" }}>
                          <Td py={2}>
                            <VStack align="start" spacing={0}>
                              <Text fontSize="xs" fontWeight="800" color="gray.900" noOfLines={1}>
                                {promo.productName || promo.productCode}
                              </Text>
                              <Text fontSize="10px" color="gray.500" fontWeight="600">
                                {promo.productCode}
                              </Text>
                            </VStack>
                          </Td>
                          <Td py={2}>
                            <Badge colorScheme="purple" fontSize="10px" px={2} borderRadius="md" fontWeight="800">
                              {promo.campaignName || "Oferta del Mes"}
                            </Badge>
                          </Td>
                          <Td py={2} textAlign="center">
                            <Badge bg="amber.400" color="amber.950" fontSize="11px" px={2} py={0.5} borderRadius="md" fontWeight="900">
                              -{promo.discountPct}%
                            </Badge>
                          </Td>
                          <Td py={2} textAlign="center">
                            <IconButton
                              size="xs"
                              colorScheme="red"
                              variant="ghost"
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                              aria-label="Eliminar promoción"
                              isLoading={deletingCode === promo.productCode}
                              onClick={() => handleDelete(promo.productCode)}
                              borderRadius="md"
                            />
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </VStack>
        </ModalBody>

        <Flex justify="flex-end" p={4} bg="white" borderTop="1px solid" borderColor="gray.200">
          <Button size="sm" onClick={onClose} fontWeight="800" px={5} borderRadius="lg">
            Cerrar
          </Button>
        </Flex>
      </ModalContent>
    </Modal>
  );
}

export default ProductPromotionsModal;
