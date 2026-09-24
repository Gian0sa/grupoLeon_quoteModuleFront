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
  Minimize2,
  Sparkles,
  UserCheck,
  PackageCheck,
  Receipt,
  Award,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import {
  buildPermissionTree,
  getSelectionState,
  ROLE_PRESETS,
  getPresetServiceIds
} from "../utils/permissionTreeHelper";

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

  // Calcular dinámicamente la cantidad de servicios de cada plantilla según el catálogo cargado
  const presetCounts = useMemo(() => {
    if (!services || services.length === 0) {
      return { vendedor: 0, facturacion: 0, supervisor: 0, admin: 0 };
    }
    return {
      vendedor: getPresetServiceIds("vendedor", services).length,
      facturacion: getPresetServiceIds("facturacion", services).length,
      supervisor: getPresetServiceIds("supervisor", services).length,
      admin: services.length,
    };
  }, [services]);

  // Determinar si la selección actual coincide con alguna plantilla exacta
  const activePresetKey = useMemo(() => {
    if (!services || services.length === 0) return null;
    const currentCount = (permittedServices || []).length;
    if (currentCount === 0) return "limpiar";
    if (currentCount === services.length) return "admin";

    const currentSet = new Set((permittedServices || []).map((id) => Number(id)));

    for (const key of ["vendedor", "facturacion", "supervisor"]) {
      const presetIds = getPresetServiceIds(key, services);
      if (presetIds.length === currentCount && presetIds.every((id) => currentSet.has(id))) {
        return key;
      }
    }
    return null;
  }, [services, permittedServices]);

  // Aplicar plantilla de rol con un solo clic
  const handleApplyPreset = (presetKey) => {
    const presetIds = getPresetServiceIds(presetKey, services);
    onChange(presetIds);
  };

  // Normalizar búsqueda
  const normalizedQuery = searchQuery.trim().toLowerCase();

  return (
    <Box w="full">
      {/* ─── BARRA DE PLANTILLAS RÁPIDAS DE ROL (1 SOLO CLIC) ─── */}
      <Box
        mb={3.5}
        p={3}
        bg="linear-gradient(to right, #f8fafc, #f1f5f9)"
        borderRadius="xl"
        border="1.5px solid"
        borderColor="gray.200"
        boxShadow="xs"
      >
        <Flex
          direction={{ base: "column", sm: "row" }}
          justify="space-between"
          align={{ base: "flex-start", sm: "center" }}
          gap={1.5}
          mb={2.5}
        >
          <HStack spacing={2}>
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
            <Text fontSize="xs" fontWeight="900" color="gray.800" textTransform="uppercase" letterSpacing="wider">
              Plantillas Rápidas de Rol
            </Text>
            <Badge
              bg="#dbeafe"
              color="#1e40af"
              border="1px solid #bfdbfe"
              fontSize="9.5px"
              fontWeight="800"
              px={2}
              py={0.2}
              borderRadius="full"
            >
              1 Clic
            </Badge>
          </HStack>
          <Text fontSize="11px" color="gray.500" fontWeight="500">
            Aplica automáticamente los permisos recomendados sin marcar casilla por casilla
          </Text>
        </Flex>

        <Flex wrap="wrap" gap={2}>
          {/* 🟢 VENDEDOR */}
          <Button
            size="xs"
            variant="outline"
            bg={activePresetKey === "vendedor" ? "#dcfce7" : "white"}
            borderColor={activePresetKey === "vendedor" ? "#16a34a" : "#bbf7d0"}
            color="#15803d"
            _hover={{ bg: "#dcfce7", borderColor: "#16a34a", transform: "translateY(-1px)" }}
            _active={{ transform: "translateY(0)" }}
            boxShadow={activePresetKey === "vendedor" ? "0 0 0 2px rgba(22, 163, 74, 0.3)" : "none"}
            transition="all 0.15s ease"
            leftIcon={<UserCheck className="w-3.5 h-3.5 stroke-[2.5]" />}
            onClick={() => handleApplyPreset("vendedor")}
            fontWeight="800"
            borderRadius="lg"
            h="32px"
            px={3}
            title={ROLE_PRESETS.vendedor?.description}
          >
            Vendedor (Comercial)
            <Badge ml={1.5} bg="#bbf7d0" color="#166534" fontSize="9px" px={1.5} borderRadius="full">
              {presetCounts.vendedor}
            </Badge>
          </Button>

          {/* 🔵 FACTURACIÓN */}
          <Button
            size="xs"
            variant="outline"
            bg={activePresetKey === "facturacion" ? "#e0f2fe" : "white"}
            borderColor={activePresetKey === "facturacion" ? "#0284c7" : "#bae6fd"}
            color="#0369a1"
            _hover={{ bg: "#e0f2fe", borderColor: "#0284c7", transform: "translateY(-1px)" }}
            _active={{ transform: "translateY(0)" }}
            boxShadow={activePresetKey === "facturacion" ? "0 0 0 2px rgba(2, 132, 199, 0.3)" : "none"}
            transition="all 0.15s ease"
            leftIcon={<Receipt className="w-3.5 h-3.5 stroke-[2.5]" />}
            onClick={() => handleApplyPreset("facturacion")}
            fontWeight="800"
            borderRadius="lg"
            h="32px"
            px={3}
            title={ROLE_PRESETS.facturacion?.description}
          >
            Facturación / Créditos
            <Badge ml={1.5} bg="#bae6fd" color="#075985" fontSize="9px" px={1.5} borderRadius="full">
              {presetCounts.facturacion}
            </Badge>
          </Button>

          {/* 🟣 SUPERVISOR */}
          <Button
            size="xs"
            variant="outline"
            bg={activePresetKey === "supervisor" ? "#f3e8ff" : "white"}
            borderColor={activePresetKey === "supervisor" ? "#9333ea" : "#e9d5ff"}
            color="#7e22ce"
            _hover={{ bg: "#f3e8ff", borderColor: "#9333ea", transform: "translateY(-1px)" }}
            _active={{ transform: "translateY(0)" }}
            boxShadow={activePresetKey === "supervisor" ? "0 0 0 2px rgba(147, 51, 234, 0.3)" : "none"}
            transition="all 0.15s ease"
            leftIcon={<Award className="w-3.5 h-3.5 stroke-[2.5]" />}
            onClick={() => handleApplyPreset("supervisor")}
            fontWeight="800"
            borderRadius="lg"
            h="32px"
            px={3}
            title={ROLE_PRESETS.supervisor?.description}
          >
            Supervisor Comercial
            <Badge ml={1.5} bg="#e9d5ff" color="#6b21a8" fontSize="9px" px={1.5} borderRadius="full">
              {presetCounts.supervisor}
            </Badge>
          </Button>

          {/* 🛡️ ADMIN TOTAL */}
          <Button
            size="xs"
            variant="outline"
            bg={activePresetKey === "admin" ? "#fee2e2" : "white"}
            borderColor={activePresetKey === "admin" ? "#dc2626" : "#fecaca"}
            color="#b91c1c"
            _hover={{ bg: "#fee2e2", borderColor: "#dc2626", transform: "translateY(-1px)" }}
            _active={{ transform: "translateY(0)" }}
            boxShadow={activePresetKey === "admin" ? "0 0 0 2px rgba(220, 38, 38, 0.3)" : "none"}
            transition="all 0.15s ease"
            leftIcon={<ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />}
            onClick={() => handleApplyPreset("admin")}
            fontWeight="800"
            borderRadius="lg"
            h="32px"
            px={3}
            title={ROLE_PRESETS.admin?.description}
          >
            Admin Total
            <Badge ml={1.5} bg="#fecaca" color="#991b1b" fontSize="9px" px={1.5} borderRadius="full">
              Todos
            </Badge>
          </Button>

          {/* ⚪ LIMPIAR */}
          <Button
            size="xs"
            variant="outline"
            bg={activePresetKey === "limpiar" ? "#f1f5f9" : "white"}
            borderColor={activePresetKey === "limpiar" ? "#94a3b8" : "#e2e8f0"}
            color="gray.600"
            _hover={{ bg: "#f1f5f9", borderColor: "#cbd5e1" }}
            transition="all 0.15s ease"
            leftIcon={<RotateCcw className="w-3.5 h-3.5 text-gray-500" />}
            onClick={() => handleApplyPreset("limpiar")}
            fontWeight="700"
            borderRadius="lg"
            h="32px"
            px={3}
            title="Desmarcar todos los permisos"
          >
            Limpiar Selección
          </Button>
        </Flex>
      </Box>

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
