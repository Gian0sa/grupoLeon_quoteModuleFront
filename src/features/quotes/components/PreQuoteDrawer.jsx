import React from "react";
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Box,
  Badge,
  IconButton,
  Flex,
  Divider,
  useToast,
} from "@chakra-ui/react";
import { Trash2, Plus, Minus, ArrowRight, ShoppingBag, Zap, CheckCircle2 } from "lucide-react";
import { useQuoteStore } from "../stores/quoteStore";
import { useNavigate } from "react-router-dom";

export function PreQuoteDrawer({ isOpen, onClose }) {
  const { products, updateProduct, removeProduct, getTotals, clear } = useQuoteStore();
  const navigate = useNavigate();
  const toast = useToast();

  const totals = getTotals();

  const handleIncreaseQty = (item) => {
    updateProduct(item.id, { quantity: (item.quantity || 1) + 1 });
  };

  const handleDecreaseQty = (item) => {
    if (item.quantity > 1) {
      updateProduct(item.id, { quantity: item.quantity - 1 });
    } else {
      removeProduct(item.id);
    }
  };

  const handleConvertToSapOrder = () => {
    if (products.length === 0) {
      toast({
        title: "Lista vacía",
        description: "Agrega al menos un producto a la Pre-Cotización.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    onClose();
    navigate("/newquotes");

    toast({
      title: "🚀 Pre-Cotización Cargada",
      description: `Se han transferido ${products.length} producto(s) a la Orden de Venta SAP.`,
      status: "success",
      duration: 4000,
      isClosable: true,
    });
  };

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={onClose} size="md">
      <DrawerOverlay backdropFilter="blur(4px)" />
      <DrawerContent borderRadius="2xl 0 0 2xl">
        <DrawerCloseButton mt={2} />

        {/* CABECERA DE LA PRE-COTIZACIÓN */}
        <DrawerHeader borderBottomWidth="1px" borderColor="gray.100" pt={5} pb={4}>
          <HStack spacing={3}>
            <Box p={2.5} bg="green.50" borderRadius="xl" color="green.700">
              <Zap className="w-5 h-5 text-green-600" />
            </Box>
            <Box>
              <HStack spacing={2}>
                <Text fontSize="lg" fontWeight="800" color="gray.900">
                  Pre-Cotización Rápida
                </Text>
                <Badge colorScheme="green" borderRadius="full" px={2.5} py={0.5} fontSize="10px">
                  Borrador
                </Badge>
              </HStack>
              <Text fontSize="xs" color="gray.500" fontWeight="500">
                Lista preliminar para atención y negociación con el cliente
              </Text>
            </Box>
          </HStack>
        </DrawerHeader>

        {/* CUERPO - LISTA DE PRODUCTOS SELECCIONADOS */}
        <DrawerBody px={4} py={4}>
          {products.length === 0 ? (
            <Flex direction="column" align="center" justify="center" h="100%" color="gray.400" textAlign="center" py={12}>
              <Box p={4} bg="gray.100" borderRadius="full" mb={3}>
                <ShoppingBag className="w-8 h-8 text-gray-400" />
              </Box>
              <Text fontWeight="700" color="gray.600" fontSize="sm" mb={1}>
                Tu lista de Pre-Cotización está vacía
              </Text>
              <Text fontSize="xs" color="gray.400" maxW="260px">
                Explora el catálogo o la lista de precios y presiona <strong>"➕ Pre-Cotizar"</strong> para armar tu propuesta.
              </Text>
            </Flex>
          ) : (
            <VStack spacing={3} align="stretch">
              <Flex justify="space-between" align="center" px={1}>
                <Text fontSize="xs" fontWeight="700" color="gray.600" textTransform="uppercase" letterSpacing="wider">
                  {products.length} Producto{products.length !== 1 ? "s" : ""} Seleccionado{products.length !== 1 ? "s" : ""}
                </Text>
                <Button
                  size="xs"
                  variant="ghost"
                  colorScheme="red"
                  onClick={() => clear()}
                  fontSize="11px"
                >
                  Vaciar Lista
                </Button>
              </Flex>

              {products.map((item) => {
                const unitPrice = Number(item.importe ?? item.price ?? 0);
                const lineTotal = unitPrice * Number(item.quantity || 1);

                return (
                  <Box
                    key={item.id}
                    p={3.5}
                    bg="white"
                    borderRadius="xl"
                    border="1px solid"
                    borderColor="gray.200"
                    boxShadow="sm"
                    _hover={{ borderColor: "green.400" }}
                    transition="all 0.2s"
                  >
                    <Flex justify="space-between" align="flex-start" gap={2} mb={2}>
                      <Box flex={1}>
                        <HStack spacing={2} mb={0.5}>
                          <Badge colorScheme="gray" fontSize="10px" borderRadius="md">
                            {item.sigla || item.id}
                          </Badge>
                        </HStack>
                        <Text fontSize="xs" fontWeight="800" color="gray.900" noOfLines={2}>
                          {item.name}
                        </Text>
                      </Box>

                      <IconButton
                        icon={<Trash2 size={14} />}
                        size="xs"
                        colorScheme="red"
                        variant="ghost"
                        aria-label="Eliminar producto"
                        onClick={() => removeProduct(item.id)}
                      />
                    </Flex>

                    <Flex justify="space-between" align="center" pt={2} borderTop="1px dashed" borderColor="gray.100">
                      {/* CONTROLES DE CANTIDAD STEPPER */}
                      <HStack spacing={1.5} bg="gray.100" p={1} borderRadius="lg">
                        <IconButton
                          icon={<Minus size={12} />}
                          size="xs"
                          variant="solid"
                          bg="white"
                          color="gray.700"
                          aria-label="Disminuir"
                          onClick={() => handleDecreaseQty(item)}
                          boxShadow="xs"
                        />
                        <Text fontSize="xs" fontWeight="800" px={2} minW="20px" textAlign="center">
                          {item.quantity}
                        </Text>
                        <IconButton
                          icon={<Plus size={12} />}
                          size="xs"
                          variant="solid"
                          bg="white"
                          color="gray.700"
                          aria-label="Aumentar"
                          onClick={() => handleIncreaseQty(item)}
                          boxShadow="xs"
                        />
                      </HStack>

                      {/* PRECIO UNITARIO Y TOTAL */}
                      <Box textAlign="right">
                        <Text fontSize="10px" color="gray.500">
                          S/ {unitPrice.toFixed(2)} c/u
                        </Text>
                        <Text fontSize="xs" fontWeight="800" color="green.700">
                          S/ {lineTotal.toFixed(2)}
                        </Text>
                      </Box>
                    </Flex>
                  </Box>
                );
              })}
            </VStack>
          )}
        </DrawerBody>

        {/* PIE - MONTO TOTAL Y BOTÓN DE CONVERSIÓN A SAP */}
        {products.length > 0 && (
          <DrawerFooter borderTopWidth="1px" borderColor="gray.100" flexDirection="column" gap={3} bg="gray.50">
            <VStack w="full" spacing={1.5} align="stretch">
              <Flex justify="space-between" fontSize="xs" color="gray.600">
                <Text>Subtotal (sin IGV):</Text>
                <Text fontWeight="600">S/ {totals.subtotal.toFixed(2)}</Text>
              </Flex>
              <Flex justify="space-between" fontSize="xs" color="gray.600">
                <Text>IGV (18%):</Text>
                <Text fontWeight="600">S/ {totals.taxTotal.toFixed(2)}</Text>
              </Flex>
              <Divider my={1} />
              <Flex justify="space-between" fontSize="md" fontWeight="800" color="gray.900">
                <Text>Total Estimado:</Text>
                <Text color="green.700">S/ {totals.docTotal.toFixed(2)}</Text>
              </Flex>
            </VStack>

            <Button
              w="full"
              size="lg"
              bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
              color="white"
              borderRadius="xl"
              leftIcon={<CheckCircle2 className="w-5 h-5" />}
              rightIcon={<ArrowRight className="w-5 h-5" />}
              onClick={handleConvertToSapOrder}
              fontWeight="800"
              fontSize="sm"
              boxShadow="0 4px 15px rgba(22, 101, 52, 0.3)"
              _hover={{ bg: "#0d4226", transform: "translateY(-1px)" }}
              py={6}
            >
              Convertir a Orden de Venta SAP
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
