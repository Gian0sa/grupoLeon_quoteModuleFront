import React, { useState, useMemo, useEffect, useCallback, memo } from "react";
import {
  Box,
  Flex,
  Text,
  HStack,
  VStack,
  Badge,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  IconButton,
  Collapse
} from "@chakra-ui/react";
import {
  Folder,
  FolderOpen,
  FileText,
  ChevronRight,
  ChevronDown,
  Check,
  Minus,
  Search,
  X,
  CheckSquare,
  Square,
  Maximize2,
  Minimize2
} from "lucide-react";
import { buildPermissionTree, getSelectionState } from "../utils/permissionTreeHelper";

/**
 * Checkbox visual personalizado de alta fidelidad memoizado
 */
const CustomTreeCheckbox = memo(function CustomTreeCheckbox({ isChecked, isIndeterminate, onChange }) {
  return (
    <Flex
      as="button"
      type="button"
      align="center"
      justify="center"
      w="18px"
      h="18px"
      minW="18px"
      borderRadius="md"
      cursor="pointer"
      transition="all 0.15s ease-in-out"
      bg={isChecked || isIndeterminate ? "#16a34a" : "white"}
      border="1.5px solid"
      borderColor={isChecked || isIndeterminate ? "#16a34a" : "#cbd5e1"}
      _hover={{
        borderColor: "#16a34a",
        boxShadow: "0 0 0 2px rgba(22, 163, 74, 0.2)"
      }}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!isChecked);
      }}
    >
      {isChecked && <Check className="w-3.5 h-3.5 text-white stroke-[3.5]" />}
      {!isChecked && isIndeterminate && <Minus className="w-3.5 h-3.5 text-white stroke-[3.5]" />}
    </Flex>
  );
});

/**
 * Badge de Estado de Selección memoizado
 */
const StatusPill = memo(function StatusPill({ status }) {
  if (status === "all") {
    return (
      <Badge
        bg="#dcfce7"
        color="#15803d"
        border="1px solid #bbf7d0"
        px={2.5}
        py={0.5}
        borderRadius="full"
        fontSize="10px"
        fontWeight="900"
        letterSpacing="wider"
      >
        ACTIVO
      </Badge>
    );
  }
  if (status === "partial") {
    return (
      <Badge
        bg="#fef3c7"
        color="#b45309"
        border="1px solid #fde68a"
        px={2.5}
        py={0.5}
        borderRadius="full"
        fontSize="10px"
        fontWeight="900"
        letterSpacing="wider"
      >
        PARCIAL
      </Badge>
    );
  }
  return (
    <Badge
      bg="#f1f5f9"
      color="#94a3b8"
      border="1px solid #e2e8f0"
      px={2.5}
      py={0.5}
      borderRadius="full"
      fontSize="10px"
      fontWeight="800"
      letterSpacing="wider"
    >
      INACTIVO
    </Badge>
  );
});

/**
 * Componente principal del Árbol de Permisos Dinámico de Alta Fidelidad
 */
const PermissionsTreeView = memo(function PermissionsTreeView({
  services = [],
  permittedServices = [],
  onChange
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedKeys, setExpandedKeys] = useState(new Set());

  // Construir árbol dinámico 100% fiel a los servicios de la base de datos
  const tree = useMemo(() => {
    return buildPermissionTree(services);
  }, [services]);

  // Inicialmente expandir todas las categorías
  useEffect(() => {
    if (tree.length > 0 && expandedKeys.size === 0) {
      const allKeys = new Set(tree.map((cat) => cat.key));
      setExpandedKeys(allKeys);
    }
  }, [tree]);

  const toggleExpand = (key) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => {
    const allKeys = new Set(tree.map((cat) => cat.key));
    setExpandedKeys(allKeys);
  };

  const collapseAll = () => {
    setExpandedKeys(new Set());
  };

  // Manejo de selecciones individuales y grupales
  const handleToggleService = (serviceId, checked) => {
    const current = new Set((permittedServices || []).map((id) => Number(id)));
    const targetId = Number(serviceId);
    if (checked) {
      current.add(targetId);
    } else {
      current.delete(targetId);
    }
    onChange(Array.from(current));
  };

  const handleToggleCategory = (categoryServices, selectAll) => {
    const current = new Set((permittedServices || []).map((id) => Number(id)));
    const ids = (categoryServices || []).map((s) => Number(s.id));

    if (selectAll) {
      ids.forEach((id) => current.add(id));
    } else {
      ids.forEach((id) => current.delete(id));
    }

    onChange(Array.from(current));
  };

  const selectAllTree = () => {
    const allIds = (services || []).map((s) => Number(s.id));
    onChange(allIds);
  };

  const deselectAllTree = () => {
    onChange([]);
  };

  // Normalizar búsqueda
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return (
    <Box w="full">
      {/* ─── BARRA SUPERIOR DE ACCIONES RÁPIDAS ─── */}
      <Flex
        direction={{ base: "column", md: "row" }}
        justify="space-between"
        align={{ base: "stretch", md: "center" }}
        gap={3}
        mb={3}
      >
        {/* Botones de Expansión (Izquierda) */}
        <HStack spacing={2} wrap="wrap">
          <Button
            size="xs"
            variant="outline"
            borderColor="gray.300"
            color="gray.700"
            bg="white"
            _hover={{ bg: "gray.50", borderColor: "gray.400" }}
            leftIcon={<Maximize2 className="w-3 h-3 text-gray-500" />}
            onClick={expandAll}
            fontWeight="700"
            borderRadius="md"
            h="28px"
          >
            Expandir Todo
          </Button>
          <Button
            size="xs"
            variant="outline"
            borderColor="gray.300"
            color="gray.700"
            bg="white"
            _hover={{ bg: "gray.50", borderColor: "gray.400" }}
            leftIcon={<Minimize2 className="w-3 h-3 text-gray-500" />}
            onClick={collapseAll}
            fontWeight="700"
            borderRadius="md"
            h="28px"
          >
            Colapsar Todo
          </Button>

          <Badge
            bg="#eff6ff"
            color="#1d4ed8"
            border="1px solid #bfdbfe"
            px={2.5}
            py={1}
            borderRadius="full"
            fontSize="11px"
            fontWeight="800"
          >
            {permittedServices.length} de {services.length} SELECCIONADOS
          </Badge>
        </HStack>

        {/* Botones de Selección (Derecha) */}
        <HStack spacing={2} wrap="wrap">
          <Button
            size="xs"
            variant="outline"
            borderColor="#c4b5fd"
            color="#6d28d9"
            bg="#f5f3ff"
            _hover={{ bg: "#ede9fe", borderColor: "#a78bfa" }}
            leftIcon={<CheckSquare className="w-3.5 h-3.5 text-purple-600" />}
            onClick={selectAllTree}
            fontWeight="800"
            borderRadius="md"
            h="28px"
          >
            Seleccionar Todo
          </Button>
          <Button
            size="xs"
            variant="outline"
            borderColor="#fecdd3"
            color="#be123c"
            bg="#fff1f2"
            _hover={{ bg: "#ffe4e6", borderColor: "#fda4af" }}
            leftIcon={<Square className="w-3.5 h-3.5 text-rose-600" />}
            onClick={deselectAllTree}
            fontWeight="800"
            borderRadius="md"
            h="28px"
          >
            Deseleccionar Todo
          </Button>
        </HStack>
      </Flex>

      {/* Buscador dentro del Árbol */}
      <InputGroup size="sm" mb={3}>
        <InputLeftElement pointerEvents="none">
          <Search className="w-4 h-4 text-gray-400" />
        </InputLeftElement>
        <Input
          placeholder="Buscar permiso, ruta de endpoint o módulo..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          bg="white"
          borderRadius="lg"
          borderColor="gray.300"
          _focus={{ borderColor: "green.500", boxShadow: "0 0 0 1px #16a34a" }}
        />
        {searchQuery && (
          <InputRightElement>
            <IconButton
              size="xs"
              variant="ghost"
              icon={<X className="w-3.5 h-3.5 text-gray-400" />}
              onClick={() => setSearchQuery("")}
              aria-label="Limpiar búsqueda"
            />
          </InputRightElement>
        )}
      </InputGroup>

      {/* ─── CONTENEDOR DEL ÁRBOL VISUAL DINÁMICO ─── */}
      <Box
        bg="white"
        p={{ base: 3, md: 5 }}
        borderRadius="2xl"
        border="1.5px solid"
        borderColor="gray.200"
        boxShadow="xs"
        maxH="520px"
        overflowY="auto"
        className="custom-scrollbar"
      >
        <VStack align="stretch" spacing={2.5}>
          {tree.map((cat) => {
            const isCatExpanded = expandedKeys.has(cat.key) || Boolean(normalizedQuery);
            const catStatus = getSelectionState(cat.services, permittedServices);

            // Filtrar categoría y servicios si hay búsqueda activa
            const matchesCat =
              !normalizedQuery ||
              cat.name.toLowerCase().includes(normalizedQuery) ||
              cat.code.toLowerCase().includes(normalizedQuery) ||
              cat.services.some(
                (s) =>
                  (s.name || "").toLowerCase().includes(normalizedQuery) ||
                  (s.path || "").toLowerCase().includes(normalizedQuery) ||
                  (s.method || "").toLowerCase().includes(normalizedQuery) ||
                  (s.displayName || "").toLowerCase().includes(normalizedQuery)
              );

            if (!matchesCat) return null;

            return (
              <Box key={cat.key} borderBottom="1px solid" borderColor="gray.100" pb={2}>
                {/* ─── Nivel 1: Categoría Principal (Carpeta) ─── */}
                <Flex
                  align="center"
                  justify="space-between"
                  py={1.5}
                  px={2}
                  borderRadius="lg"
                  _hover={{ bg: "gray.50" }}
                  transition="background 0.15s"
                >
                  <HStack spacing={2} flex="1" minW={0}>
                    {/* Botón Expandir/Colapsar */}
                    <IconButton
                      size="xs"
                      variant="ghost"
                      w="20px"
                      h="20px"
                      minW="20px"
                      icon={
                        isCatExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-500" />
                        )
                      }
                      onClick={() => toggleExpand(cat.key)}
                      aria-label="Expandir categoría"
                    />

                    {/* Checkbox de Selección de Categoría */}
                    <CustomTreeCheckbox
                      isChecked={catStatus === "all"}
                      isIndeterminate={catStatus === "partial"}
                      onChange={(checked) => handleToggleCategory(cat.services, checked)}
                    />

                    {/* Ícono de Carpeta */}
                    <Box color="#f59e0b">
                      {isCatExpanded ? (
                        <FolderOpen className="w-4 h-4 fill-amber-400" />
                      ) : (
                        <Folder className="w-4 h-4 fill-amber-400" />
                      )}
                    </Box>

                    {/* Nombre de la Categoría */}
                    <Text fontSize="sm" fontWeight="800" color="gray.800" noOfLines={1}>
                      {cat.name}
                    </Text>

                    {/* Badge con cantidad de servicios en la categoría */}
                    <Badge
                      bg="gray.100"
                      color="gray.700"
                      border="1px solid #e2e8f0"
                      px={1.5}
                      py={0.2}
                      borderRadius="md"
                      fontSize="9.5px"
                      fontWeight="800"
                    >
                      {cat.services.length}
                    </Badge>

                    {/* Tag de Código / Slug */}
                    <Badge
                      bg="#f8fafc"
                      color="#475569"
                      border="1px solid #e2e8f0"
                      px={1.5}
                      py={0.2}
                      borderRadius="md"
                      fontSize="9px"
                      fontFamily="mono"
                    >
                      #{cat.code}
                    </Badge>
                  </HStack>

                  {/* Estado ACTIVO / PARCIAL / INACTIVO */}
                  <StatusPill status={catStatus} />
                </Flex>

                {/* ─── Nivel 2: Endpoints y Servicios Hojas ─── */}
                <Collapse in={isCatExpanded} animateOpacity>
                  <VStack align="stretch" spacing={1} pl={6} pt={1.5} position="relative">
                    {/* Línea guía vertical de la categoría */}
                    <Box
                      position="absolute"
                      left="19px"
                      top="0"
                      bottom="8px"
                      w="1.5px"
                      bg="gray.200"
                    />

                    {cat.services.map((srv, srvIdx) => {
                      const isLeafActive = (permittedServices || []).some((id) => Number(id) === Number(srv.id));
                      const isLastLeaf = srvIdx === cat.services.length - 1;

                      const matchesLeaf =
                        !normalizedQuery ||
                        (srv.name || "").toLowerCase().includes(normalizedQuery) ||
                        (srv.displayName || "").toLowerCase().includes(normalizedQuery) ||
                        (srv.path || "").toLowerCase().includes(normalizedQuery) ||
                        (srv.method || "").toLowerCase().includes(normalizedQuery);

                      if (!matchesLeaf) return null;

                      return (
                        <Flex
                          key={srv.id}
                          align="center"
                          justify="space-between"
                          py={0.8}
                          px={2}
                          borderRadius="md"
                          _hover={{ bg: "#f0fdf4" }}
                          transition="background 0.1s"
                        >
                          <HStack spacing={2} flex="1" minW={0}>
                            {/* Guía horizontal del árbol */}
                            <Text color="gray.300" fontSize="xs" fontFamily="mono" select="none">
                              {isLastLeaf ? "└" : "├"}
                            </Text>

                            <CustomTreeCheckbox
                              isChecked={isLeafActive}
                              onChange={(checked) => handleToggleService(srv.id, checked)}
                            />

                            <FileText className="w-3.5 h-3.5 text-gray-400" />

                            <Text fontSize="11.5px" fontWeight="600" color="gray.800" noOfLines={1}>
                              {srv.displayName || srv.name}
                            </Text>

                            <Badge
                              bg="#f8fafc"
                              color="#64748b"
                              border="1px solid #e2e8f0"
                              px={1.5}
                              py={0.1}
                              borderRadius="md"
                              fontSize="9px"
                              fontFamily="mono"
                              noOfLines={1}
                            >
                              {srv.method ? `${srv.method} ${srv.path || ""}` : srv.endpointCode}
                            </Badge>
                          </HStack>

                          <StatusPill status={isLeafActive ? "all" : "none"} />
                        </Flex>
                      );
                    })}
                  </VStack>
                </Collapse>
              </Box>
            );
          })}
        </VStack>
      </Box>
    </Box>
  );
});

export default PermissionsTreeView;
