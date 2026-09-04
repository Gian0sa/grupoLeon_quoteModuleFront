// src/theme.js
import { extendTheme } from "@chakra-ui/react";

const config = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const styles = {
  global: {
    // Blindaje anti scroll horizontal: ningún elemento ancho (tablas, steppers,
    // grillas) puede empujar el viewport completo. El desplazamiento lateral
    // solo debe existir dentro de contenedores que lo declaren explícitamente.
    "html, body, #root": {
      overflowX: "hidden",
      maxWidth: "100vw",
    },
    "html, body": {
      minHeight: "100vh",
    },
    body: {
      bg: "bg",
      color: "text",
      WebkitTextSizeAdjust: "100%",
    },
    "#root": {
      minHeight: "100vh",
      position: "relative",
    },
    // Medios anchos nunca desbordan su contenedor en teléfonos
    "img, svg, video, canvas": {
      maxWidth: "100%",
    },
    // Scrollbar interno visible en contenedores con overflow lateral propio,
    // para que el usuario perciba que ese bloque se desplaza (no la página).
    "@media (max-width: 767px)": {
      ".mobile-scroll-x": {
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        maxWidth: "100%",
      },
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

// Áreas de toque accesibles para el público objetivo (35–65 años).
// En móvil (base) los controles crecen a 42–48px de alto; en escritorio (md+)
// conservan las dimensiones compactas originales de Chakra para no alterar
// las densidades de pantalla ya diseñadas.
const TOUCH_FIELD = {
  xs: { base: "36px", md: "24px" },
  sm: { base: "42px", md: "32px" },
  md: { base: "48px", md: "40px" },
  lg: { base: "52px", md: "48px" },
};

// 16px en móvil evita el auto-zoom de iOS al enfocar un campo (que es una de
// las causas más comunes de desplazamiento horizontal accidental).
const TOUCH_FONT = {
  xs: { base: "sm", md: "xs" },
  sm: { base: "md", md: "sm" },
  md: { base: "md", md: "md" },
};

const components = {
  Button: {
    // minW se iguala a minH para que los IconButton sigan siendo cuadrados;
    // los botones con texto crecen por su contenido y no se ven afectados.
    sizes: {
      xs: { minH: TOUCH_FIELD.xs, minW: TOUCH_FIELD.xs, fontSize: TOUCH_FONT.xs },
      sm: { minH: TOUCH_FIELD.sm, minW: TOUCH_FIELD.sm, fontSize: TOUCH_FONT.sm },
      md: { minH: TOUCH_FIELD.md, minW: TOUCH_FIELD.md },
      lg: { minH: TOUCH_FIELD.lg, minW: TOUCH_FIELD.lg },
    },
  },
  Input: {
    sizes: {
      sm: { field: { h: TOUCH_FIELD.sm, fontSize: TOUCH_FONT.sm } },
      md: { field: { h: TOUCH_FIELD.md, fontSize: TOUCH_FONT.md } },
    },
  },
  Select: {
    sizes: {
      sm: { field: { h: TOUCH_FIELD.sm, fontSize: TOUCH_FONT.sm } },
      md: { field: { h: TOUCH_FIELD.md, fontSize: TOUCH_FONT.md } },
    },
  },
  NumberInput: {
    sizes: {
      sm: { field: { h: TOUCH_FIELD.sm, fontSize: TOUCH_FONT.sm } },
      md: { field: { h: TOUCH_FIELD.md, fontSize: TOUCH_FONT.md } },
    },
  },
  Textarea: {
    sizes: {
      sm: { fontSize: TOUCH_FONT.sm },
      md: { fontSize: TOUCH_FONT.md },
    },
  },
};

const colors = {
  emerald: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    700: "#047857",
    800: "#065f46",
    900: "#064e3b",
    950: "#022c22",
  },
};

const theme = extendTheme({ config, styles, fonts, colors, semanticTokens, textStyles, components });

export default theme;
