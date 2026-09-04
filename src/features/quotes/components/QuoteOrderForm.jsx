import { useEffect, useMemo } from "react";
import {
  Box, Grid, GridItem, FormControl, FormLabel, Input, Select as ChakraSelect,
  Table, Thead, Tbody, Tr, Th, Td, TableContainer, IconButton,
  NumberInput, NumberInputField, Text, HStack, VStack, Badge, Divider,
  Heading, Tooltip, Alert, AlertIcon, Tabs, TabList, TabPanels, Tab, TabPanel, Textarea, Button, Flex,
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Truck, CreditCard, Paperclip, Trash2, Edit3, Plus, Minus,
  Warehouse, Calendar, DollarSign, FileText, Info, CheckCircle2, ShieldAlert
} from "lucide-react";
import { useQuoteStore } from "../stores/quoteStore";
import ItemAutocomplete from "./ItemAutocomplete";
import ClientAutocomplete from "./ClientAutocomplete";
import PackagingHelper from "./PackagingHelper";
import { lineNet, round2 } from "../utils/quoteCalculations";
import { useExchangeRate } from "../../dashboard/hooks/queries/dashboardQueries";
import { useIgvRate, useGetWarehouses } from "../hooks/queries/quotesQueries";

const MotionBox = motion(Box);

const CURRENCIES = ["USD", "PEN"];

const money = (value, currency = "USD") =>
  Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: currency === "PEN" ? "PEN" : "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const todayIso = () => new Date().toISOString().split("T")[0];

export default function QuoteOrderForm({ sellerName }) {
  const {
    client, setClient, products, currency, whsCode, contactPerson, refNumber,
    docDate, docDueDate, igvRate, exchangeRateOfficial, exchangeRateApplied,
    comment, setComment,
    setCurrency, setWhsCode, setContactPerson, setRefNumber,
    setDocDate, setDocDueDate, setExchangeRate, setIgvRate,
    addProduct, removeProduct, updateProduct, getTotals,
  } = useQuoteStore();

  const { warehouses: sapWarehouses } = useGetWarehouses();
  const availableWarehouses = sapWarehouses || [];

  const { data: rateData } = useExchangeRate({
    currency: "USD",
    date: docDate || todayIso(),
  });

  const { igvRate: configuredIgv } = useIgvRate();

  useEffect(() => {
    if (configuredIgv != null) setIgvRate(configuredIgv);
  }, [configuredIgv, setIgvRate]);

  useEffect(() => {
    if (!rateData) return;
    setExchangeRate({
      official: rateData.officialRate,
      applied: rateData.officialRate,
    });
  }, [rateData, setExchangeRate]);

  useEffect(() => {
    if (!docDate) setDocDate(todayIso());
  }, [docDate, setDocDate]);

  const totals = useMemo(() => getTotals(), [getTotals, products, igvRate]);
  const igvLabel = `${round2((igvRate > 1 ? igvRate : igvRate * 100) || 0)}%`;

  return (
    <VStack align="stretch" spacing={{ base: 4, md: 6 }} pb={{ base: "80px", md: "20px" }}>
      {/* ── 1. CABECERA DEL DOCUMENTO (DATOS PRINCIPALES SAP) ── */}
      <MotionBox
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        bg="white"
        p={{ base: 4, md: 6 }}
        borderRadius="2xl"
        border="1px solid"
        borderColor="gray.200"
        boxShadow="0 4px 20px rgba(0,0,0,0.03)"
      >
        <Flex align="center" justify="space-between" mb={4} pb={2} borderBottom="1px solid" borderColor="gray.100">
          <Flex align="center" gap={2}>
            <Flex w="32px" h="32px" borderRadius="lg" bg="emerald.50" align="center" justify="center" color="emerald.700">
              <FileText className="w-4 h-4" />
            </Flex>
            <Heading size="xs" textTransform="uppercase" letterSpacing="wider" color="emerald.800" fontWeight="800">
              Orden de Venta SAP
            </Heading>
          </Flex>
          <Badge colorScheme="emerald" borderRadius="full" px={2.5} py={0.5} fontSize="10px">
            Borrador de Cotización
          </Badge>
        </Flex>

        {products.length > 0 && (
          <Alert status="success" variant="subtle" borderRadius="xl" border="1px solid" borderColor="green.200" mb={4}>
            <AlertIcon />
            <Box flex="1" fontSize="xs">
              <Text fontWeight="800" color="green.900">
                Pre-Cotización Importada ({products.length} producto{products.length !== 1 ? 's' : ''})
              </Text>
              <Text color="green.800">
                Se han cargado los productos de tu borrador. Asigna el Cliente, Sede y Términos para emitir tu Orden de Venta.
              </Text>
            </Box>
          </Alert>
        )}

        <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={{ base: 3, md: 4 }}>
          {/* CLIENTE AUTOCOMPLETE */}
          <GridItem colSpan={{ base: 1, md: 2 }}>
            <FormControl>
              <FormLabel fontSize="xs" fontWeight="700" color="gray.700" display="flex" alignItems="center" gap={1}>
                Cliente / Socio de Negocio *
              </FormLabel>
              <ClientAutocomplete client={client} setClient={setClient} />
            </FormControl>
          </GridItem>

          {/* VENDEDOR */}
          <FormControl>
            <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Vendedor Asignado</FormLabel>
            <Input
              value={sellerName || ""}
              isReadOnly
              bg="gray.50"
              h="44px"
              borderRadius="xl"
              fontSize={{ base: "15px", md: "sm" }}
              fontWeight="600"
              color="gray.800"
            />
          </FormControl>

          {/* PERSONA DE CONTACTO */}
          <FormControl>
            <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Persona de contacto</FormLabel>
            <Input
              value={contactPerson || ""}
              onChange={(e) => setContactPerson(e.target.value)}
              placeholder="Ej. Juan Pérez"
              h="44px"
              borderRadius="xl"
              fontSize={{ base: "15px", md: "sm" }}
            />
          </FormControl>

          {/* N° REFERENCIA / OC */}
          <FormControl>
            <FormLabel fontSize="xs" fontWeight="700" color="gray.700">N° Referencia / OC</FormLabel>
            <Input
              value={refNumber || ""}
              onChange={(e) => setRefNumber(e.target.value)}
              placeholder="Orden de compra del cliente"
              h="44px"
              borderRadius="xl"
              fontSize={{ base: "15px", md: "sm" }}
            />
          </FormControl>

          {/* ALMACÉN / SEDE */}
          <FormControl>
            <FormLabel fontSize="xs" fontWeight="700" color="gray.700" display="flex" alignItems="center" gap={1}>
              <Warehouse className="w-3.5 h-3.5 text-gray-500" /> Almacén / Sede *
            </FormLabel>
            <ChakraSelect
              value={whsCode || ""}
              onChange={(e) => setWhsCode(e.target.value)}
              placeholder="Seleccionar sede de despacho"
              h="44px"
              borderRadius="xl"
              fontSize={{ base: "15px", md: "sm" }}
              borderColor={!whsCode ? "amber.400" : "gray.200"}
              bg={!whsCode ? "amber.50" : "white"}
            >
              {availableWarehouses.map((w) => (
                <option key={w.code || w} value={w.code || w}>
                  {w.name || `Almacén ${w.code || w}`}
                </option>
              ))}
            </ChakraSelect>
          </FormControl>

          {/* MONEDA */}
          <FormControl>
            <FormLabel fontSize="xs" fontWeight="700" color="gray.700" display="flex" alignItems="center" gap={1}>
              <DollarSign className="w-3.5 h-3.5 text-gray-500" /> Moneda del Documento
            </FormLabel>
            <ChakraSelect
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              h="44px"
              borderRadius="xl"
              fontSize={{ base: "15px", md: "sm" }}
              fontWeight="bold"
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c === "USD" ? "USD - Dólar Estadounidense" : "PEN - Soles Peruanos"}</option>
              ))}
            </ChakraSelect>
          </FormControl>

          {/* TIPO DE CAMBIO */}
          <FormControl>
            <FormLabel fontSize="xs" fontWeight="700" color="gray.700">
              Tipo de Cambio Aplicado
            </FormLabel>
            <Input
              value={exchangeRateApplied ? `S/ ${exchangeRateApplied}` : "—"}
              isReadOnly
              bg="gray.50"
              placeholder="—"
              h="44px"
              borderRadius="xl"
              fontSize={{ base: "15px", md: "sm" }}
              fontWeight="bold"
              color="emerald.800"
            />
            {exchangeRateOfficial != null && (
              <Text fontSize="10px" color="gray.500" mt={1}>
                Oficial SAP: S/ {exchangeRateOfficial}
              </Text>
            )}
          </FormControl>

          {/* FECHA CONTABILIZACIÓN */}
          <FormControl>
            <FormLabel fontSize="xs" fontWeight="700" color="gray.700" display="flex" alignItems="center" gap={1}>
              <Calendar className="w-3.5 h-3.5 text-gray-500" /> Fecha Contabilización
            </FormLabel>
            <Input
              type="date"
              value={docDate || ""}
              onChange={(e) => setDocDate(e.target.value)}
              h="44px"
              borderRadius="xl"
              fontSize={{ base: "15px", md: "sm" }}
            />
          </FormControl>

          {/* FECHA ENTREGA */}
          <FormControl>
            <FormLabel fontSize="xs" fontWeight="700" color="gray.700" display="flex" alignItems="center" gap={1}>
              <Calendar className="w-3.5 h-3.5 text-gray-500" /> Fecha de Entrega
            </FormLabel>
            <Input
              type="date"
              value={docDueDate || ""}
              onChange={(e) => setDocDueDate(e.target.value)}
              h="44px"
              borderRadius="xl"
              fontSize={{ base: "15px", md: "sm" }}
            />
          </FormControl>
        </Grid>
      </MotionBox>

      {/* ── 2. PESTAÑAS DE COTIZACIÓN ESTILO SAP ── */}
      <MotionBox
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        bg="white"
        p={{ base: 3, md: 6 }}
        borderRadius="2xl"
        border="1px solid"
        borderColor="gray.200"
        boxShadow="0 4px 20px rgba(0,0,0,0.03)"
      >
        <Tabs variant="soft-rounded" colorScheme="green">
          <TabList
            pb={2}
            overflowX="auto"
            css={{
              scrollbarWidth: "none",
              "::-webkit-scrollbar": { display: "none" },
            }}
            gap={2}
          >
            <Tab fontSize="xs" fontWeight="700" py={2} px={4} borderRadius="xl">
              <Package className="w-3.5 h-3.5 mr-1.5 inline" /> Contenido ({products.length})
            </Tab>
            <Tab fontSize="xs" fontWeight="700" py={2} px={4} borderRadius="xl">
              <Truck className="w-3.5 h-3.5 mr-1.5 inline" /> Logística
            </Tab>
            <Tab fontSize="xs" fontWeight="700" py={2} px={4} borderRadius="xl">
              <CreditCard className="w-3.5 h-3.5 mr-1.5 inline" /> Finanzas
            </Tab>
            <Tab fontSize="xs" fontWeight="700" py={2} px={4} borderRadius="xl">
              <Paperclip className="w-3.5 h-3.5 mr-1.5 inline" /> Anexos
            </Tab>
          </TabList>

          <TabPanels pt={3}>
            {/* PESTAÑA 1: CONTENIDO */}
            <TabPanel px={0} py={1}>
              {/* BUSCADOR DE ARTÍCULOS */}
              <Box mb={4}>
                <ItemAutocomplete
                  onSelect={(item) => addProduct({ ...item, whsCode: item.whsCode || whsCode || "014" })}
                  isDisabled={!whsCode}
                  placeholder={
                    whsCode
                      ? "Buscar artículo por código (ej. 301102003001) o descripción..."
                      : "⚠️ Selecciona primero un almacén/sede arriba para consultar stock"
                  }
                />
                {!whsCode && (
                  <Alert status="warning" mt={2} borderRadius="xl" fontSize="xs">
                    <AlertIcon />
                    Debes seleccionar la Sede / Almacén antes de agregar artículos para validar el stock en tiempo real.
                  </Alert>
                )}
              </Box>

              {/* ── VISTA DESKTOP: TABLA COMPLETA DE ARTÍCULOS ── */}
              <Box display={{ base: "none", md: "block" }}>
                <TableContainer border="1px solid" borderColor="gray.200" borderRadius="xl" overflowX="auto">
                  <Table size="sm" variant="striped" colorScheme="gray">
                    <Thead bg="gray.100">
                      <Tr>
                        <Th isNumeric w="30px">#</Th>
                        <Th>Código</Th>
                        <Th>Descripción del artículo</Th>
                        <Th isNumeric>En stock</Th>
                        <Th>Almacén</Th>
                        <Th isNumeric w="80px">Cant</Th>
                        <Th isNumeric>Precio Unit.</Th>
                        <Th isNumeric w="75px">Desc %</Th>
                        <Th>Impuesto</Th>
                        <Th isNumeric>Valor Venta</Th>
                        <Th textAlign="center" w="50px">Acción</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {products.length === 0 && (
                        <Tr>
                          <Td colSpan={11}>
                            <VStack py={8} spacing={2}>
                              <Package className="w-8 h-8 text-gray-300 animate-bounce" />
                              <Text fontSize="sm" color="gray.500" fontWeight="600">
                                Sin artículos agregados a la cotización
                              </Text>
                              <Text fontSize="xs" color="gray.400">
                                Utiliza el buscador superior para añadir repuestos o baterías.
                              </Text>
                            </VStack>
                          </Td>
                        </Tr>
                      )}

                      {products.map((p, idx) => {
                        const unitPrice = p.importe ?? p.price ?? 0;
                        const net = lineNet(p.quantity, unitPrice, p.discount ?? 0, p.lineDiscount ?? 0);
                        const exceedsStock = Number(p.quantity) > Number(p.stock ?? 0);

                        return (
                          <Tr key={p.id} _hover={{ bg: "emerald.50" }} transition="background 0.2s">
                            <Td isNumeric fontWeight="bold" color="gray.600">{idx + 1}</Td>
                            <Td fontFamily="mono" fontSize="xs" fontWeight="bold" color="emerald.800">
                              {p.id}
                            </Td>
                            <Td maxW="280px">
                              <Text fontSize="xs" fontWeight="700" color="gray.800" noOfLines={2}>
                                {p.name}
                              </Text>
                              {p.marca && <Text fontSize="10px" color="gray.500">{p.marca}</Text>}
                            </Td>
                            <Td isNumeric>
                              <Badge colorScheme={exceedsStock ? "red" : "green"} fontSize="10px" px={2} py={0.5} borderRadius="full">
                                {p.stock ?? 0}
                              </Badge>
                            </Td>
                            <Td>
                              <Badge colorScheme="purple" fontSize="10px" borderRadius="md">
                                {p.whsCode || whsCode || "014"}
                              </Badge>
                            </Td>
                            <Td isNumeric>
                              <VStack align="flex-end" spacing={1}>
                                <NumberInput
                                  size="xs"
                                  min={1}
                                  value={p.quantity}
                                  onChange={(_, valueAsNumber) =>
                                    updateProduct(p.id, {
                                      quantity: Number.isNaN(valueAsNumber) ? 1 : valueAsNumber,
                                    })
                                  }
                                  maxW="70px"
                                >
                                  <NumberInputField textAlign="right" borderRadius="md" fontWeight="bold" />
                                </NumberInput>
                                <PackagingHelper
                                  itemName={p.name || p.itemName || p.description}
                                  sigla={p.sigla}
                                  raw={p.raw || p}
                                  currentQuantity={p.quantity || 1}
                                  onQuantityChange={(units) => updateProduct(p.id, { quantity: units })}
                                />
                                {exceedsStock && (
                                  <Text fontSize="9px" color="red.500" fontWeight="bold">
                                    ¡Supera Stock!
                                  </Text>
                                )}
                              </VStack>
                            </Td>
                            <Td isNumeric fontSize="xs" fontWeight="600">
                              {money(unitPrice, currency)}
                            </Td>
                            <Td isNumeric>
                              <NumberInput
                                size="xs"
                                min={0}
                                max={100}
                                value={p.lineDiscount ?? 0}
                                onChange={(_, valueAsNumber) =>
                                  updateProduct(p.id, {
                                    lineDiscount: Number.isNaN(valueAsNumber) ? 0 : valueAsNumber,
                                  })
                                }
                                maxW="65px"
                              >
                                <NumberInputField textAlign="right" borderRadius="md" />
                              </NumberInput>
                            </Td>
                            <Td>
                              <Badge colorScheme="blue" fontSize="10px" variant="solid">
                                {p.taxCode || "I18"}
                              </Badge>
                            </Td>
                            <Td isNumeric fontWeight="bold" fontSize="xs" color="emerald.900">
                              {money(net, currency)}
                            </Td>
                            <Td textAlign="center">
                              <IconButton
                                aria-label="Eliminar producto"
                                icon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
                                size="xs"
                                colorScheme="red"
                                variant="ghost"
                                borderRadius="md"
                                onClick={() => removeProduct(p.id)}
                              />
                            </Td>
                          </Tr>
                        );
                      })}
                    </Tbody>
                  </Table>
                </TableContainer>
              </Box>

              {/* ── VISTA MÓVIL (SMARTPHONES): TARJETAS RESPONSIVAS ── */}
              <Box display={{ base: "block", md: "none" }}>
                {products.length === 0 ? (
                  <VStack py={6} bg="gray.50" borderRadius="xl" border="1px border-dashed" borderColor="gray.300">
                    <Package className="w-8 h-8 text-gray-400" />
                    <Text fontSize="xs" color="gray.500" fontWeight="600">
                      Sin artículos en la cotización
                    </Text>
                  </VStack>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {products.map((p, idx) => {
                      const unitPrice = p.importe ?? p.price ?? 0;
                      const net = lineNet(p.quantity, unitPrice, p.discount ?? 0, p.lineDiscount ?? 0);
                      const exceedsStock = Number(p.quantity) > Number(p.stock ?? 0);

                      return (
                        <Box
                          key={p.id}
                          p={3.5}
                          bg="white"
                          borderRadius="xl"
                          border="1px solid"
                          borderColor={exceedsStock ? "red.200" : "gray.200"}
                          boxShadow="0 2px 8px rgba(0,0,0,0.04)"
                        >
                          <Flex justify="space-between" align="flex-start" mb={2}>
                            <HStack spacing={1.5}>
                              <Badge colorScheme="emerald" fontSize="10px" borderRadius="md" px={1.5}>
                                #{idx + 1}
                              </Badge>
                              <Badge colorScheme="gray" fontSize="10px" fontFamily="mono">
                                {p.id}
                              </Badge>
                              {p.marca && (
                                <Badge colorScheme="purple" fontSize="9px">
                                  {p.marca}
                                </Badge>
                              )}
                            </HStack>
                            <IconButton
                              aria-label="Eliminar producto"
                              icon={<Trash2 className="w-4 h-4 text-red-600" />}
                              size="xs"
                              colorScheme="red"
                              variant="solid"
                              borderRadius="full"
                              onClick={() => removeProduct(p.id)}
                            />
                          </Flex>

                          <Text fontSize="sm" fontWeight="700" color="gray.800" mb={2.5}>
                            {p.name}
                          </Text>

                          <Grid templateColumns="repeat(2, 1fr)" gap={2} bg="gray.50" p={2.5} borderRadius="lg" mb={2.5}>
                            <Box>
                              <Text fontSize="10px" color="gray.500">Stock Sede</Text>
                              <Badge colorScheme={exceedsStock ? "red" : "green"} fontSize="10px">
                                {p.stock ?? 0} disp.
                            <Box>
                              <Text fontSize="10px" color="gray.500">Precio Unitario</Text>
                              <Text fontSize="xs" fontWeight="700">{money(unitPrice, currency)}</Text>
                            </Box>

                            <Box colSpan={2}>
                              <Text fontSize="10px" color="gray.500" mb={1}>Cantidad</Text>
                              <VStack align="flex-start" spacing={1}>
                                <HStack spacing={1}>
                                  <IconButton
                                    aria-label="Restar"
                                    icon={<Minus className="w-3 h-3" />}
                                    size="xs"
                                    onClick={() => updateProduct(p.id, { quantity: Math.max(1, p.quantity - 1) })}
                                  />
                                  <Text fontSize="xs" fontWeight="800" px={2}>{p.quantity}</Text>
                                  <IconButton
                                    aria-label="Sumar"
                                    icon={<Plus className="w-3 h-3" />}
                                    size="xs"
                                    onClick={() => updateProduct(p.id, { quantity: p.quantity + 1 })}
                                  />
                                </HStack>
                                <PackagingHelper
                                  itemName={p.name || p.itemName || p.description}
                                  sigla={p.sigla}
                                  raw={p.raw || p}
                                  currentQuantity={p.quantity || 1}
                                  onQuantityChange={(units) => updateProduct(p.id, { quantity: units })}
                                />
                              </VStack>
                            </Box>>
                              </HStack>
                            </Box>

                            <Box>
                              <Text fontSize="10px" color="gray.500">Desc. %</Text>
                              <NumberInput
                                size="xs"
                                min={0}
                                max={100}
                                value={p.lineDiscount ?? 0}
                                onChange={(_, v) => updateProduct(p.id, { lineDiscount: Number.isNaN(v) ? 0 : v })}
                                maxW="60px"
                              >
                                <NumberInputField bg="white" />
                              </NumberInput>
                            </Box>
                          </Grid>

                          <Flex justify="space-between" align="center" pt={1} borderTop="1px solid" borderColor="gray.100">
                            <Text fontSize="xs" color="gray.500">Valor Venta Línea:</Text>
                            <Text fontSize="sm" fontWeight="800" color="emerald.700">
                              {money(net, currency)}
                            </Text>
                          </Flex>
                        </Box>
                      );
                    })}
                  </VStack>
                )}
              </Box>

              {/* ── TOTALES Y OBSERVACIONES ESTRUCTURA SAP ── */}
              <Grid templateColumns={{ base: "1fr", md: "1fr 340px" }} gap={6} mt={6} align="start">
                <Box bg="gray.50" p={4} borderRadius="xl" border="1px solid" borderColor="gray.200">
                  <FormLabel fontSize="xs" fontWeight="700" color="gray.700">Comentarios u Observaciones de Cotización:</FormLabel>
                  <Textarea
                    value={comment || ""}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Detalla aquí condiciones de entrega, garantía o validez de la oferta..."
                    size="sm"
                    rows={3}
                    borderRadius="lg"
                    bg="white"
                  />
                </Box>

                <Box bg="linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)" p={5} borderRadius="2xl" border="1px solid" borderColor="gray.200" boxShadow="sm">
                  <VStack align="stretch" spacing={2.5}>
                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600" fontWeight="600">Total antes del descuento:</Text>
                      <Text fontSize="xs" fontWeight="700">
                        {money(totals.subtotal + totals.discountTotal, currency)}
                      </Text>
                    </HStack>

                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600" fontWeight="600">Descuento Total:</Text>
                      <Text fontSize="xs" fontWeight="700" color="orange.600">
                        −{money(totals.discountTotal, currency)}
                      </Text>
                    </HStack>

                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600" fontWeight="600">Subtotal (Base Imponible):</Text>
                      <Text fontSize="xs" fontWeight="700">
                        {money(totals.subtotal, currency)}
                      </Text>
                    </HStack>

                    <HStack justify="space-between">
                      <Text fontSize="xs" color="gray.600" fontWeight="600">Impuesto (IGV {igvLabel}):</Text>
                      <Text fontSize="xs" fontWeight="700" color="blue.700">
                        {money(totals.taxTotal, currency)}
                      </Text>
                    </HStack>

                    <Divider borderColor="gray.300" my={1} />

                    <HStack justify="space-between">
                      <Text fontSize="sm" fontWeight="800" color="gray.900">Total del Documento:</Text>
                      <Text fontSize="lg" fontWeight="900" color="emerald.700">
                        {money(totals.docTotal, currency)}
                      </Text>
                    </HStack>

                    <Text fontSize="10px" color="gray.500" textAlign="right" mt={1}>
                      * Sincronización oficial calculada con Service Layer SAP
                    </Text>
                  </VStack>
                </Box>
              </Grid>
            </TabPanel>

            <TabPanel py={4}>
              <Text fontSize="xs" color="gray.600">🚛 Datos logísticos de transporte y entrega.</Text>
            </TabPanel>

            <TabPanel py={4}>
              <Text fontSize="xs" color="gray.600">💳 Condiciones financieras y créditos.</Text>
            </TabPanel>

            <TabPanel py={4}>
              <Text fontSize="xs" color="gray.600">📎 Comprobantes y adjuntos.</Text>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </MotionBox>

      {/* ── BARRA FLOTANTE FIJA PARA MÓVILES (STICKY BOTTOM BAR) ── */}
      <Box
        display={{ base: "block", md: "none" }}
        position="fixed"
        bottom={0}
        left={0}
        right={0}
        zIndex={1000}
        bg="white"
        p={3}
        borderTop="1px solid"
        borderColor="gray.200"
        boxShadow="0 -4px 15px rgba(0,0,0,0.08)"
      >
        <Flex align="center" justify="space-between" gap={2}>
          <Box>
            <Text fontSize="10px" color="gray.500" fontWeight="600">Total Documento</Text>
            <Text fontSize="md" fontWeight="900" color="emerald.700">
              {money(totals.docTotal, currency)}
            </Text>
          </Box>
          <Button
            size="sm"
            bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
            color="white"
            borderRadius="xl"
            fontWeight="800"
            px={5}
            isDisabled={!client || products.length === 0}
            onClick={() => alert("✅ Cotización simulada aprobada exitosamente en entorno Sandbox.")}
          >
            Aprobar Cotización
          </Button>
        </Flex>
      </Box>
    </VStack>
  );
}
