// src/theme.js
import { extendTheme } from "@chakra-ui/react";

const config = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const styles = {
  global: {
    body: {
      bg: "bg",
      color: "text",
    },
  },
};

const semanticTokens = {
  colors: {
    // Fondos
    bg: { default: "white", _dark: "gray.900" },
    card: { default: "white", _dark: "gray.800" },

    // Texto
    text: { default: "black", _dark: "gray.200" },
    title: { default: "gray.700", _dark: "gray.100" },    // títulos en cards
    subtitle: { default: "gray.500", _dark: "gray.400" }, // subtítulos / detalles
    textSecondary: { default: "gray.600", _dark: "gray.400" }, // para labels, descripciones

    // Bordes
    border: { default: "gray.200", _dark: "gray.700" },

    // Acentos generales
    accent: { default: "green.600", _dark: "green.700" },
    accentAlt: { default: "purple.500", _dark: "purple.300" },
    accentTeal: { default: "teal.500", _dark: "teal.300" },

    // Hover
    hover: { default: "gray.100", _dark: "gray.700" }, // para _hover en botones, cajas, etc.

    // Barra de progreso
    progressBg: { default: "gray.100", _dark: "gray.700" },

    // Estados
    success: { default: "green.400", _dark: "green.300" },
    warning: { default: "yellow.400", _dark: "yellow.300" },
    error: { default: "red.400", _dark: "red.300" },
    info: { default: "blue.500", _dark: "blue.300" },
  },
};

const fonts = {
  heading: `'Inter', 'InterVariable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
  body: `'Inter', 'InterVariable', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`,
};

// Estilo unificado para títulos/nombres en cards y listas (producto, cliente, número de orden, etc.)
// No incluye color: varios usos necesitan color dinámico (p. ej. según estado) pasado aparte.
const textStyles = {
  cardTitle: {
    fontWeight: "medium",
    fontSize: "sm",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    textAlign: "left",
    flex: "1",
  },
};

const theme = extendTheme({ config, styles, fonts, semanticTokens, textStyles });

export default theme;
