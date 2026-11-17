import { Box, Grid, GridItem, Flex, Text, HStack } from "@chakra-ui/react";
import { Tag, ShoppingBag, CreditCard, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useHasAccess } from "../../../shared/utils/permissions";
import { useHeaderTheme } from "../../../hooks/useHeaderTheme";

const MotionBox = motion(Box);

/**
 * Paletas armónicas de acciones rápidas para temas alternativos.
 * En 'green' (por defecto), se preservan 100% los valores originales institucionales.
 */
const THEME_ACTION_PALETTES = {
  rose_pastel: {
    pillBg: "rgba(255, 255, 255, 0.52)",
    pillBorder: "rgba(61, 8, 38, 0.22)",
    pillShadow: "0 4px 14px rgba(61, 8, 38, 0.10)",
    pillHoverBg: "rgba(255, 255, 255, 0.78)",
    pillHoverBorder: "rgba(61, 8, 38, 0.42)",
    pillHoverShadow: "0 8px 20px rgba(61, 8, 38, 0.16)",
    actions: {
      quotes: { color: "#831843", bgGlow: "rgba(131, 24, 67, 0.14)", borderColor: "rgba(131, 24, 67, 0.30)" },
      prices: { color: "#9D174D", bgGlow: "rgba(157, 23, 77, 0.14)", borderColor: "rgba(157, 23, 77, 0.30)" },
      orders: { color: "#6B21A8", bgGlow: "rgba(107, 33, 168, 0.14)", borderColor: "rgba(107, 33, 168, 0.30)" },
      receivable: { color: "#991B1B", bgGlow: "rgba(153, 27, 27, 0.14)", borderColor: "rgba(153, 27, 27, 0.30)" },
    },
  },
  rose_neon: {
    pillBg: { base: "rgba(255, 255, 255, 0.22)", md: "rgba(255, 255, 255, 0.20)" },
    pillBorder: "rgba(255, 255, 255, 0.30)",
    pillShadow: "0 4px 18px rgba(162, 10, 91, 0.35)",
    pillHoverBg: "rgba(255, 255, 255, 0.28)",
    pillHoverBorder: "rgba(255, 255, 255, 0.60)",
    pillHoverShadow: "0 8px 24px rgba(162, 10, 91, 0.45)",
    actions: {
      quotes: { color: "#FBCFE8", bgGlow: "rgba(251, 207, 232, 0.25)", borderColor: "rgba(251, 207, 232, 0.45)" },
      prices: { color: "#F472B6", bgGlow: "rgba(244, 114, 182, 0.25)", borderColor: "rgba(244, 114, 182, 0.45)" },
      orders: { color: "#C084FC", bgGlow: "rgba(192, 132, 252, 0.25)", borderColor: "rgba(192, 132, 252, 0.45)" },
      receivable: { color: "#FDA4AF", bgGlow: "rgba(253, 164, 175, 0.25)", borderColor: "rgba(253, 164, 175, 0.45)" },
    },
  },
  rose_combined: {
    pillBg: { base: "rgba(255, 255, 255, 0.22)", md: "rgba(255, 255, 255, 0.20)" },
    pillBorder: "rgba(255, 255, 255, 0.30)",
    pillShadow: "0 4px 18px rgba(139, 18, 79, 0.32)",
    pillHoverBg: "rgba(255, 255, 255, 0.28)",
    pillHoverBorder: "rgba(255, 255, 255, 0.60)",
    pillHoverShadow: "0 8px 24px rgba(139, 18, 79, 0.42)",
    actions: {
      quotes: { color: "#FCE7F3", bgGlow: "rgba(252, 231, 243, 0.25)", borderColor: "rgba(252, 231, 243, 0.45)" },
      prices: { color: "#F472B6", bgGlow: "rgba(244, 114, 182, 0.25)", borderColor: "rgba(244, 114, 182, 0.45)" },
      orders: { color: "#E879F9", bgGlow: "rgba(232, 121, 249, 0.25)", borderColor: "rgba(232, 121, 249, 0.45)" },
      receivable: { color: "#FDA4AF", bgGlow: "rgba(253, 164, 175, 0.25)", borderColor: "rgba(253, 164, 175, 0.45)" },
    },
  },
  blue_ocean: {
    pillBg: { base: "rgba(255, 255, 255, 0.22)", md: "rgba(255, 255, 255, 0.20)" },
    pillBorder: "rgba(255, 255, 255, 0.28)",
    pillShadow: "0 4px 18px rgba(0, 0, 0, 0.20)",
    pillHoverBg: "rgba(255, 255, 255, 0.28)",
    pillHoverBorder: "rgba(255, 255, 255, 0.55)",
    pillHoverShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
    actions: {
      quotes: { color: "#38BDF8", bgGlow: "rgba(56, 189, 248, 0.22)", borderColor: "rgba(56, 189, 248, 0.40)" },
      prices: { color: "#2DD4BF", bgGlow: "rgba(45, 212, 191, 0.22)", borderColor: "rgba(45, 212, 191, 0.40)" },
      orders: { color: "#93C5FD", bgGlow: "rgba(147, 197, 253, 0.22)", borderColor: "rgba(147, 197, 253, 0.40)" },
      receivable: { color: "#FB923C", bgGlow: "rgba(251, 146, 60, 0.22)", borderColor: "rgba(251, 146, 60, 0.40)" },
    },
  },
  purple_violet: {
    pillBg: { base: "rgba(255, 255, 255, 0.22)", md: "rgba(255, 255, 255, 0.20)" },
    pillBorder: "rgba(255, 255, 255, 0.28)",
    pillShadow: "0 4px 18px rgba(0, 0, 0, 0.20)",
    pillHoverBg: "rgba(255, 255, 255, 0.28)",
    pillHoverBorder: "rgba(255, 255, 255, 0.55)",
    pillHoverShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
    actions: {
      quotes: { color: "#C084FC", bgGlow: "rgba(192, 132, 252, 0.22)", borderColor: "rgba(192, 132, 252, 0.40)" },
      prices: { color: "#F472B6", bgGlow: "rgba(244, 114, 182, 0.22)", borderColor: "rgba(244, 114, 182, 0.40)" },
      orders: { color: "#67E8F9", bgGlow: "rgba(103, 232, 249, 0.22)", borderColor: "rgba(103, 232, 249, 0.40)" },
      receivable: { color: "#FBBF24", bgGlow: "rgba(251, 191, 36, 0.22)", borderColor: "rgba(251, 191, 36, 0.40)" },
    },
  },
  cyan_sky: {
    pillBg: { base: "rgba(255, 255, 255, 0.22)", md: "rgba(255, 255, 255, 0.20)" },
    pillBorder: "rgba(255, 255, 255, 0.28)",
    pillShadow: "0 4px 18px rgba(0, 0, 0, 0.18)",
    pillHoverBg: "rgba(255, 255, 255, 0.28)",
    pillHoverBorder: "rgba(255, 255, 255, 0.55)",
    pillHoverShadow: "0 8px 24px rgba(0, 0, 0, 0.26)",
    actions: {
      quotes: { color: "#2DD4BF", bgGlow: "rgba(45, 212, 191, 0.22)", borderColor: "rgba(45, 212, 191, 0.40)" },
      prices: { color: "#4ADE80", bgGlow: "rgba(74, 222, 128, 0.22)", borderColor: "rgba(74, 222, 128, 0.40)" },
      orders: { color: "#67E8F9", bgGlow: "rgba(103, 232, 249, 0.22)", borderColor: "rgba(103, 232, 249, 0.40)" },
      receivable: { color: "#FB7185", bgGlow: "rgba(251, 113, 133, 0.22)", borderColor: "rgba(251, 113, 133, 0.40)" },
    },
  },
  orange_sunset: {
    pillBg: { base: "rgba(255, 255, 255, 0.22)", md: "rgba(255, 255, 255, 0.20)" },
    pillBorder: "rgba(255, 255, 255, 0.28)",
    pillShadow: "0 4px 18px rgba(0, 0, 0, 0.18)",
    pillHoverBg: "rgba(255, 255, 255, 0.28)",
    pillHoverBorder: "rgba(255, 255, 255, 0.55)",
    pillHoverShadow: "0 8px 24px rgba(0, 0, 0, 0.26)",
    actions: {
      quotes: { color: "#FBBF24", bgGlow: "rgba(251, 191, 36, 0.22)", borderColor: "rgba(251, 191, 36, 0.40)" },
      prices: { color: "#FDE047", bgGlow: "rgba(253, 224, 71, 0.22)", borderColor: "rgba(253, 224, 71, 0.40)" },
      orders: { color: "#38BDF8", bgGlow: "rgba(56, 189, 248, 0.22)", borderColor: "rgba(56, 189, 248, 0.40)" },
      receivable: { color: "#F43F5E", bgGlow: "rgba(244, 63, 94, 0.22)", borderColor: "rgba(244, 63, 94, 0.40)" },
    },
  },
  gold_amber: {
    pillBg: { base: "rgba(255, 255, 255, 0.22)", md: "rgba(255, 255, 255, 0.20)" },
    pillBorder: "rgba(255, 255, 255, 0.28)",
    pillShadow: "0 4px 18px rgba(0, 0, 0, 0.18)",
    pillHoverBg: "rgba(255, 255, 255, 0.28)",
    pillHoverBorder: "rgba(255, 255, 255, 0.55)",
    pillHoverShadow: "0 8px 24px rgba(0, 0, 0, 0.26)",
    actions: {
      quotes: { color: "#FDE047", bgGlow: "rgba(253, 224, 71, 0.22)", borderColor: "rgba(253, 224, 71, 0.40)" },
      prices: { color: "#A3E635", bgGlow: "rgba(163, 230, 53, 0.22)", borderColor: "rgba(163, 230, 53, 0.40)" },
      orders: { color: "#38BDF8", bgGlow: "rgba(56, 189, 248, 0.22)", borderColor: "rgba(56, 189, 248, 0.40)" },
      receivable: { color: "#FB7185", bgGlow: "rgba(251, 113, 133, 0.22)", borderColor: "rgba(251, 113, 133, 0.40)" },
    },
  },
  emerald_mint: {
    pillBg: { base: "rgba(255, 255, 255, 0.22)", md: "rgba(255, 255, 255, 0.20)" },
    pillBorder: "rgba(255, 255, 255, 0.28)",
    pillShadow: "0 4px 18px rgba(0, 0, 0, 0.18)",
    pillHoverBg: "rgba(255, 255, 255, 0.28)",
    pillHoverBorder: "rgba(255, 255, 255, 0.55)",
    pillHoverShadow: "0 8px 24px rgba(0, 0, 0, 0.26)",
    actions: {
      quotes: { color: "#34D399", bgGlow: "rgba(52, 211, 153, 0.24)", borderColor: "rgba(52, 211, 153, 0.42)" },
      prices: { color: "#6EE7B7", bgGlow: "rgba(110, 231, 183, 0.24)", borderColor: "rgba(110, 231, 183, 0.42)" },
      orders: { color: "#38BDF8", bgGlow: "rgba(56, 189, 248, 0.24)", borderColor: "rgba(56, 189, 248, 0.42)" },
      receivable: { color: "#F87171", bgGlow: "rgba(248, 113, 113, 0.24)", borderColor: "rgba(248, 113, 113, 0.42)" },
    },
  },
  red_crimson: {
    pillBg: { base: "rgba(255, 255, 255, 0.22)", md: "rgba(255, 255, 255, 0.20)" },
    pillBorder: "rgba(255, 255, 255, 0.28)",
    pillShadow: "0 4px 18px rgba(0, 0, 0, 0.22)",
    pillHoverBg: "rgba(255, 255, 255, 0.28)",
    pillHoverBorder: "rgba(255, 255, 255, 0.55)",
    pillHoverShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
    actions: {
      quotes: { color: "#FDA4AF", bgGlow: "rgba(253, 164, 175, 0.22)", borderColor: "rgba(253, 164, 175, 0.40)" },
      prices: { color: "#FB923C", bgGlow: "rgba(251, 146, 60, 0.22)", borderColor: "rgba(251, 146, 60, 0.40)" },
      orders: { color: "#38BDF8", bgGlow: "rgba(56, 189, 248, 0.22)", borderColor: "rgba(56, 189, 248, 0.40)" },
      receivable: { color: "#FCD34D", bgGlow: "rgba(252, 211, 77, 0.22)", borderColor: "rgba(252, 211, 77, 0.40)" },
    },
  },
  dark_slate: {
    pillBg: { base: "rgba(255, 255, 255, 0.16)", md: "rgba(255, 255, 255, 0.14)" },
    pillBorder: "rgba(255, 255, 255, 0.22)",
    pillShadow: "0 4px 18px rgba(0, 0, 0, 0.35)",
    pillHoverBg: "rgba(255, 255, 255, 0.22)",
    pillHoverBorder: "rgba(255, 255, 255, 0.45)",
    pillHoverShadow: "0 8px 24px rgba(0, 0, 0, 0.45)",
    actions: {
      quotes: { color: "#34D399", bgGlow: "rgba(52, 211, 153, 0.22)", borderColor: "rgba(52, 211, 153, 0.40)" },
      prices: { color: "#38BDF8", bgGlow: "rgba(56, 189, 248, 0.22)", borderColor: "rgba(56, 189, 248, 0.40)" },
      orders: { color: "#818CF8", bgGlow: "rgba(129, 140, 248, 0.22)", borderColor: "rgba(129, 140, 248, 0.40)" },
      receivable: { color: "#FBBF24", bgGlow: "rgba(251, 191, 36, 0.22)", borderColor: "rgba(251, 191, 36, 0.40)" },
    },
  },
};

export function QuickActions() {
  const navigate = useNavigate();
  const hasAccess = useHasAccess();
  const { theme } = useHeaderTheme();

  const themeKey = theme?.key || "green";
  const isGreen = themeKey === "green";
  const isDarkText = Boolean(theme?.useDarkText);
  const themeConfig = THEME_ACTION_PALETTES[themeKey];

  const canAccessQuotes = hasAccess("GET:/quotes") || hasAccess("POST:/quotes") || hasAccess("POST:/quotes/approval");
  const canAccessPrices = hasAccess("GET:/priceList") || hasAccess("GET /priceList");
  const canAccessOrders = hasAccess("GET:/reports") || hasAccess("GET /reports") || hasAccess("GET:/orders") || hasAccess("GET /orders") || hasAccess("GET:/orderswithStatus/:code/:estadopedido");
  const canAccessReceivable = hasAccess("GET:/accountsReceivable") || hasAccess("GET /accountsReceivable") || hasAccess("GET:/receivable");

  // Definición original de acciones con soporte de fallback
  const rawActions = [
    ...(canAccessQuotes ? [{
      key: "quotes",
      labelDesktop: "Cotizaciones",
      labelMobile: "Cotizaciones",
      labelCompact: "Cotizaciones",
      icon: FileText,
      path: "/historyquotes",
      // Valores originales institucionales (tema green)
      originalColor: "#34d399",
      originalBgGlow: "rgba(52, 211, 153, 0.25)",
      originalBorderColor: "rgba(52, 211, 153, 0.4)",
      darkTextColor: "#047857",
      darkTextBgGlow: "rgba(4, 120, 87, 0.14)",
      darkTextBorderColor: "rgba(4, 120, 87, 0.30)",
    }] : []),
    ...(canAccessPrices ? [{
      key: "prices",
      labelDesktop: "Lista de Precios",
      labelMobile: "Lista Precios",
      labelCompact: "Precios",
      icon: Tag,
      path: "/productsPriceList",
      // Valores originales institucionales (tema green)
      originalColor: "#4ade80",
      originalBgGlow: "rgba(74, 222, 128, 0.22)",
      originalBorderColor: "rgba(74, 222, 128, 0.4)",
      darkTextColor: "#15803d",
      darkTextBgGlow: "rgba(21, 128, 61, 0.14)",
      darkTextBorderColor: "rgba(21, 128, 61, 0.30)",
    }] : []),
    ...(canAccessOrders ? [{
      key: "orders",
      labelDesktop: "Mis Pedidos",
      labelMobile: "Mis Pedidos",
      labelCompact: "Pedidos",
      icon: ShoppingBag,
      path: "/reports",
      // Valores originales institucionales (tema green)
      originalColor: "#60a5fa",
      originalBgGlow: "rgba(96, 165, 250, 0.22)",
      originalBorderColor: "rgba(96, 165, 250, 0.4)",
      darkTextColor: "#1d4ed8",
      darkTextBgGlow: "rgba(29, 78, 216, 0.14)",
      darkTextBorderColor: "rgba(29, 78, 216, 0.30)",
    }] : []),
    ...(canAccessReceivable ? [{
      key: "receivable",
      labelDesktop: "Cuentas por Cobrar",
      labelMobile: "Cobranzas",
      labelCompact: "Cobranzas",
      icon: CreditCard,
      path: "/receivable",
      // Valores originales institucionales (tema green)
      originalColor: "#f87171",
      originalBgGlow: "rgba(248, 113, 113, 0.22)",
      originalBorderColor: "rgba(248, 113, 113, 0.4)",
      darkTextColor: "#b91c1c",
      darkTextBgGlow: "rgba(185, 28, 28, 0.14)",
      darkTextBorderColor: "rgba(185, 28, 28, 0.30)",
    }] : []),
  ];

  // Resolver estilos de píldora según tema:
  // Si es 'green', se devuelven 100% exactos los valores originales.
  // Si es otro tema, se priorizan tokens de theme.quickActions, luego theme root, luego THEME_ACTION_PALETTES, luego glass/darkText.
  const pillBg = isGreen
    ? { base: "rgba(255, 255, 255, 0.22)", md: "rgba(255, 255, 255, 0.20)" }
    : (theme?.quickActions?.pillBg || theme?.pillBg || themeConfig?.pillBg || (isDarkText ? "rgba(255, 255, 255, 0.52)" : { base: "rgba(255, 255, 255, 0.22)", md: "rgba(255, 255, 255, 0.20)" }));

  const pillBorder = isGreen
    ? "rgba(255, 255, 255, 0.28)"
    : (theme?.quickActions?.pillBorder || theme?.pillBorder || themeConfig?.pillBorder || (isDarkText ? (theme?.glassBorder || "rgba(61, 8, 38, 0.24)") : "rgba(255, 255, 255, 0.28)"));

  const pillShadow = isGreen
    ? "0 4px 18px rgba(0, 0, 0, 0.16)"
    : (theme?.quickActions?.pillShadow || theme?.pillShadow || themeConfig?.pillShadow || (isDarkText ? "0 4px 14px rgba(61, 8, 38, 0.12)" : "0 4px 18px rgba(0, 0, 0, 0.16)"));

  const pillHoverBg = isGreen
    ? "rgba(255, 255, 255, 0.26)"
    : (theme?.quickActions?.pillHoverBg || theme?.pillHoverBg || themeConfig?.pillHoverBg || (isDarkText ? "rgba(255, 255, 255, 0.76)" : "rgba(255, 255, 255, 0.28)"));

  const pillHoverBorder = isGreen
    ? "rgba(255, 255, 255, 0.55)"
    : (theme?.quickActions?.pillHoverBorder || theme?.pillHoverBorder || themeConfig?.pillHoverBorder || (isDarkText ? "rgba(61, 8, 38, 0.44)" : "rgba(255, 255, 255, 0.55)"));

  const pillHoverShadow = isGreen
    ? "0 8px 24px rgba(0, 0, 0, 0.24)"
    : (theme?.quickActions?.pillHoverShadow || theme?.pillHoverShadow || themeConfig?.pillHoverShadow || (isDarkText ? "0 8px 20px rgba(61, 8, 38, 0.18)" : "0 8px 24px rgba(0, 0, 0, 0.24)"));

  const pillTextColor =
    theme?.pillTextColor ||
    theme?.quickActions?.pillTextColor ||
    (isDarkText ? theme?.textColor : "white");

  const actions = rawActions.map((action) => {
    // Si es verde original: valores idénticos exactos
    if (isGreen) {
      return {
        ...action,
        iconColor: action.originalColor,
        iconBgGlow: action.originalBgGlow,
        iconBorderColor: action.originalBorderColor,
      };
    }

    // 1. Tokens directos en el tema (si el tema provee theme.quickActions[key])
    if (theme?.quickActions?.[action.key]) {
      const custom = theme.quickActions[action.key];
      return {
        ...action,
        iconColor: custom.iconColor || custom.color || action.originalColor,
        iconBgGlow: custom.bgGlow || action.originalBgGlow,
        iconBorderColor: custom.borderColor || action.originalBorderColor,
      };
    }

    // 2. Mapa armónico predefinido para el tema activo
    if (themeConfig?.actions?.[action.key]) {
      const preset = themeConfig.actions[action.key];
      return {
        ...action,
        iconColor: preset.color,
        iconBgGlow: preset.bgGlow,
        iconBorderColor: preset.borderColor,
      };
    }

    // 3. Fallback para temas con texto oscuro no clasificados
    if (isDarkText) {
      return {
        ...action,
        iconColor: action.darkTextColor,
        iconBgGlow: action.darkTextBgGlow,
        iconBorderColor: action.darkTextBorderColor,
      };
    }

    // 4. Fallback por defecto
    return {
      ...action,
      iconColor: action.originalColor,
      iconBgGlow: action.originalBgGlow,
      iconBorderColor: action.originalBorderColor,
    };
  });

  const count = actions.length;
  if (count === 0) return null;

  return (
    <Box w="full" maxW="1200px" mx="auto" pt={{ base: 0.5, md: 2 }} pb={{ base: 0.5, md: 3 }} px={{ base: 0.5, sm: 2, md: 4 }}>
      {/* VISTA MÓVIL (base a sm): Fila única horizontal ultra-compacta y simétrica */}
      <Flex
        display={{ base: "flex", md: "none" }}
        w="full"
        justifyContent="center"
        alignItems="center"
        gap={count >= 4 ? { base: 1, sm: 1.5 } : { base: 1.5, sm: 2 }}
        py={0.5}
        px={0.5}
      >
        {actions.map((action) => {
          const IconComp = action.icon;
          const displayLabel = count >= 4 ? (action.labelCompact || action.labelMobile) : action.labelMobile;
          return (
            <MotionBox
              key={action.path}
              flexShrink={1}
              minW={0}
              whileTap={{ scale: 0.96 }}
              onClick={() => navigate(action.path)}
              bg={pillBg}
              border="1.5px solid"
              borderColor={pillBorder}
              color={pillTextColor}
              py={1}
              px={count >= 4 ? { base: 1.5, sm: 2.5 } : { base: 2.5, sm: 3 }}
              h={count >= 4 ? { base: "28px", sm: "32px" } : { base: "32px", sm: "36px" }}
              borderRadius="full"
              cursor="pointer"
              boxShadow={pillShadow}
              _hover={{
                bg: pillHoverBg,
                borderColor: pillHoverBorder,
                boxShadow: pillHoverShadow,
              }}
              transition={{ duration: 0.15 }}
              display="flex"
              alignItems="center"
              justifyContent="center"
              role="button"
              aria-label={action.labelDesktop}
            >
              <HStack spacing={count >= 4 ? 1 : 1.5} align="center" justify="center">
                <Flex
                  w={count >= 4 ? { base: "16px", sm: "18px" } : "20px"}
                  h={count >= 4 ? { base: "16px", sm: "18px" } : "20px"}
                  borderRadius="full"
                  bg={action.iconBgGlow}
                  border="1px solid"
                  borderColor={action.iconBorderColor || "transparent"}
                  align="center"
                  justify="center"
                  flexShrink={0}
                >
                  <IconComp
                    size={count >= 4 ? 10 : 12}
                    color={action.iconColor}
                    strokeWidth={2.4}
                  />
                </Flex>
                <Text
                  fontWeight="800"
                  fontSize={count >= 4 ? { base: "9.5px", sm: "10.5px" } : "11px"}
                  whiteSpace="nowrap"
                  lineHeight="1.2"
                  letterSpacing="tight"
                  color={pillTextColor}
                  isTruncated
                >
                  {displayLabel}
                </Text>
              </HStack>
            </MotionBox>
          );
        })}
      </Flex>

      {/* VISTA DESKTOP / TABLET (md y superior): Grid balanceado */}
      <Grid
        display={{ base: "none", md: "grid" }}
        templateColumns={{
          md: `repeat(${count}, minmax(0, 1fr))`,
          lg: `repeat(${count}, minmax(0, 260px))`,
        }}
        gap={{ md: 3.5, lg: 4 }}
        justifyContent="center"
        alignItems="center"
      >
        {actions.map((action) => {
          const IconComp = action.icon;
          return (
            <GridItem
              key={action.path}
              display="flex"
              justifyContent="center"
              minW="0"
            >
              <MotionBox
                w="full"
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(action.path)}
                bg={pillBg}
                border="1.5px solid"
                borderColor={pillBorder}
                color={pillTextColor}
                minW="0"
                py={{ md: 2.5 }}
                px={{ md: 4, lg: 5 }}
                h="48px"
                borderRadius="full"
                cursor="pointer"
                boxShadow={pillShadow}
                transition={{ duration: 0.15 }}
                display="flex"
                alignItems="center"
                justifyContent="center"
                _hover={{
                  bg: pillHoverBg,
                  borderColor: pillHoverBorder,
                  boxShadow: pillHoverShadow,
                }}
                role="button"
                aria-label={action.labelDesktop}
              >
                <Flex align="center" justify="center" gap={{ md: 2.5 }} minW="0" w="full">
                  <Flex
                    w="30px"
                    h="30px"
                    borderRadius="full"
                    bg={action.iconBgGlow}
                    border="1px solid"
                    borderColor={action.iconBorderColor || "transparent"}
                    align="center"
                    justify="center"
                    flexShrink={0}
                  >
                    <IconComp
                      size={16}
                      color={action.iconColor}
                      strokeWidth={2.4}
                    />
                  </Flex>
                  <Text
                    fontWeight="800"
                    fontSize={{ md: "13px", lg: "13.5px" }}
                    whiteSpace="nowrap"
                    overflow="hidden"
                    textOverflow="ellipsis"
                    textAlign="center"
                    lineHeight="1.2"
                    letterSpacing="tight"
                    color={pillTextColor}
                    minW="0"
                  >
                    {action.labelDesktop}
                  </Text>
                </Flex>
              </MotionBox>
            </GridItem>
          );
        })}
      </Grid>
    </Box>
  );
}
