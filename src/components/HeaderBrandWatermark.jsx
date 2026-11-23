import React, { useId } from "react";
import { Box } from "@chakra-ui/react";
import { getHeaderThemeConfig } from "../shared/utils/headerThemes";

export const HEADER_BRAND_IMAGE = "/assets/header-brand-bg.webp";

const CIRCLE_VARIANTS = {
  banner: {
    topRight: { top: "-70px", right: "-50px", size: "280px", opacity: 0.75 },
    bottomLeft: { bottom: "-40px", left: "-40px", size: "160px", opacity: 0.35 },
  },
  drawer: {
    topRight: { top: "-30px", right: "-30px", size: "130px", opacity: 0.7 },
    bottomLeft: { bottom: "-15px", left: "-15px", size: "70px", opacity: 0.4 },
  },
  preview: {
    topRight: { top: "-38px", right: "-28px", size: "130px", opacity: 0.75 },
    bottomLeft: { bottom: "-28px", left: "-24px", size: "90px", opacity: 0.35 },
  },
};

/**
 * Renderiza la textura de marca original de Autopartes (/assets/header-brand-bg.webp)
 * y las esferas decorativas de cabecera.
 * 
 * - En 'green': se muestra con sus tonos naturales institucionales.
 * - En temas personalizados (#F7CAC9, #FF6EC7, etc.): se preserva exactamente la misma
 *   textura, geometría y diseño original de fondo, cambiando su color dinámicamente
 *   mediante filtros CSS (hue-rotate, saturation, brightness) y gradientes armónicos.
 */
const CHRISTMAS_SNOWFLAKES = [
  { id: "sf1", left: "4%", top: "30%", size: 18, opacity: 0.28, duration: "6s", delay: "0s" },
  { id: "sf2", left: "12%", top: "74%", size: 14, opacity: 0.22, duration: "7.5s", delay: "0.8s" },
  { id: "sf3", left: "42%", top: "24%", size: 15, opacity: 0.24, duration: "5.8s", delay: "1.4s" },
  { id: "sf4", left: "58%", top: "40%", size: 22, opacity: 0.26, duration: "6.8s", delay: "0.4s" },
  { id: "sf5", left: "73%", top: "22%", size: 16, opacity: 0.22, duration: "7.2s", delay: "1.1s" },
  { id: "sf6", left: "89%", top: "52%", size: 20, opacity: 0.28, duration: "6.4s", delay: "0.2s" },
];

const PATTERN_BULBS = [
  { cx: 24, cy: 12, color: "#FDE047", glow: "rgba(253, 224, 71, 0.55)" },
  { cx: 68, cy: 18, color: "#EF4444", glow: "rgba(239, 68, 68, 0.55)" },
  { cx: 112, cy: 11, color: "#86EFAC", glow: "rgba(134, 239, 172, 0.50)" },
  { cx: 156, cy: 18, color: "#FDE047", glow: "rgba(253, 224, 71, 0.55)" },
  { cx: 200, cy: 12, color: "#FFFFFF", glow: "rgba(255, 255, 255, 0.50)" },
];

function SnowflakeSvg({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round">
      <line x1="12" y1="2" x2="12" y2="22" />
      <line x1="3.34" y1="7" x2="20.66" y2="17" />
      <line x1="20.66" y1="7" x2="3.34" y2="17" />
      <polyline points="9.5,4.5 12,7 14.5,4.5" />
      <polyline points="9.5,19.5 12,17 14.5,19.5" />
      <polyline points="4.5,9.5 7,9 6.5,6.5" />
      <polyline points="19.5,14.5 17,15 17.5,17.5" />
    </svg>
  );
}

function ChristmasDecorationLayer({ variant = "banner" }) {
  const uid = useId().replace(/:/g, "");
  const garlandPatternId = `xmas-garland-${uid}`;
  const isCompact = variant === "preview" || variant === "drawer";

  return (
    <Box
      position="absolute"
      inset={0}
      pointerEvents="none"
      userSelect="none"
      overflow="hidden"
      zIndex={1}
      sx={{
        "@keyframes xmasFloat": {
          "0%, 100%": { transform: "translateY(0px) rotate(0deg)" },
          "50%": { transform: "translateY(5px) rotate(10deg)" },
        },
        "@keyframes xmasTwinkle": {
          "0%, 100%": { opacity: 0.65 },
          "50%": { opacity: 1 },
        },
        "@keyframes xmasSway": {
          "0%, 100%": { transform: "rotate(-2deg)" },
          "50%": { transform: "rotate(2deg)" },
        },
      }}
    >
      {/* Brillos cálidos festivos sutiles (dorado y carmesí) sobre el mismo verde */}
      <Box
        position="absolute"
        top="-30px"
        left="22%"
        w={isCompact ? "140px" : "240px"}
        h={isCompact ? "80px" : "120px"}
        borderRadius="full"
        bg="radial-gradient(circle, rgba(253, 224, 71, 0.14) 0%, transparent 70%)"
      />
      <Box
        position="absolute"
        bottom="-35px"
        right="10%"
        w={isCompact ? "150px" : "240px"}
        h={isCompact ? "90px" : "130px"}
        borderRadius="full"
        bg="radial-gradient(circle, rgba(239, 68, 68, 0.16) 0%, transparent 72%)"
      />

      {/* Guirnalda superior repetida sin estirarse (círculos 100% redondos en cualquier ancho) */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="28px"
        sx={{ animation: "xmasTwinkle 3.2s infinite ease-in-out" }}
      >
        <svg width="100%" height="28">
          <defs>
            <pattern id={garlandPatternId} width="220" height="28" patternUnits="userSpaceOnUse">
              <path
                d="M0,4 Q55,21 110,5 Q165,21 220,4"
                fill="none"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="1.4"
              />
              {PATTERN_BULBS.map((b) => (
                <g key={b.cx}>
                  <circle cx={b.cx} cy={b.cy} r="6.5" fill={b.glow} />
                  <circle cx={b.cx} cy={b.cy} r="3" fill={b.color} />
                  <circle cx={b.cx - 0.8} cy={b.cy - 0.8} r="0.9" fill="#ffffff" opacity="0.85" />
                </g>
              ))}
            </pattern>
          </defs>
          <rect width="100%" height="28" fill={`url(#${garlandPatternId})`} />
        </svg>
      </Box>

      {/* Esferas navideñas colgantes en zona libre (centro-derecha abierta, sin tapar la campana/menú) */}
      {!isCompact && (
        <Box
          position="absolute"
          top="0"
          right={{ base: "18%", lg: "28%" }}
          opacity={0.72}
          transformOrigin="top center"
          sx={{ animation: "xmasSway 4.8s infinite ease-in-out" }}
        >
          <svg width="56" height="68" viewBox="0 0 56 68">
            <line x1="16" y1="0" x2="16" y2="30" stroke="rgba(253,224,71,0.65)" strokeWidth="1.2" />
            <rect x="13.5" y="28" width="5" height="3.5" rx="1" fill="#FDE047" />
            <circle cx="16" cy="40" r="9.5" fill="#DC2626" />
            <circle cx="13" cy="36.5" r="2.6" fill="rgba(255,255,255,0.45)" />

            <line x1="40" y1="0" x2="40" y2="20" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" />
            <rect x="38" y="18" width="4" height="3" rx="1" fill="#FEF08A" />
            <circle cx="40" cy="28" r="7.5" fill="#F59E0B" />
            <circle cx="37.8" cy="25.5" r="2" fill="rgba(255,255,255,0.55)" />
          </svg>
        </Box>
      )}

      {/* Pinos navideños nevados en esquina inferior derecha (sin superponerse a botones) */}
      <Box
        position="absolute"
        bottom="-2px"
        right={isCompact ? "10px" : "22px"}
        opacity={0.28}
      >
        <svg width={isCompact ? "88" : "126"} height={isCompact ? "48" : "66"} viewBox="0 0 145 76" fill="none">
          <polygon points="38,14 14,76 62,76" fill="#073318" />
          <polygon points="38,24 19,58 57,58" fill="#0b4a24" />
          <polygon points="38,14 31,28 45,28" fill="#ffffff" opacity="0.72" />
          <polygon points="84,4 52,76 116,76" fill="#073318" />
          <polygon points="84,18 59,56 109,56" fill="#0f5c2e" />
          <polygon points="84,4 75,20 93,20" fill="#ffffff" opacity="0.78" />
          <circle cx="84" cy="4" r="3.2" fill="#FDE047" />
          <polygon points="122,22 102,76 142,76" fill="#073318" />
          <polygon points="122,22 116,35 128,35" fill="#ffffff" opacity="0.72" />
        </svg>
      </Box>

      {/* Copos de nieve SVG flotantes */}
      {CHRISTMAS_SNOWFLAKES.map((sf) => (
        <Box
          key={sf.id}
          position="absolute"
          left={sf.left}
          top={sf.top}
          opacity={sf.opacity}
          sx={{
            animation: `xmasFloat ${sf.duration} infinite ease-in-out ${sf.delay}`,
          }}
        >
          <SnowflakeSvg size={isCompact ? Math.round(sf.size * 0.78) : sf.size} />
        </Box>
      ))}

      {/* Estrella dorada navideña en zona abierta superior-central */}
      <Box
        position="absolute"
        left="52%"
        top="22%"
        opacity={0.38}
        sx={{ animation: "xmasTwinkle 2.4s infinite ease-in-out 0.3s" }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#FDE047">
          <path d="M12 1L14.8 9.2L23 12L14.8 14.8L12 23L9.2 14.8L1 12L9.2 9.2Z" />
        </svg>
      </Box>
    </Box>
  );
}

export function HeaderBrandWatermark({
  theme,
  opacity = 0.4,
  showOverlay = false,
  showCircles = false,
  variant = "banner",
}) {
  const activeTheme = theme?.key ? theme : (theme || getHeaderThemeConfig("green"));
  const circlePreset = CIRCLE_VARIANTS[variant] || CIRCLE_VARIANTS.banner;
  const isChristmas =
    activeTheme?.decorationVariant === "christmas" ||
    activeTheme?.key === "christmas_green";

  const circlesLayer = showCircles ? (
    <>
      <Box
        position="absolute"
        top={circlePreset.topRight.top}
        right={circlePreset.topRight.right}
        w={circlePreset.topRight.size}
        h={circlePreset.topRight.size}
        borderRadius="full"
        bg={activeTheme.circleBg}
        opacity={activeTheme.circleOpacity ?? circlePreset.topRight.opacity}
        filter={activeTheme.circleFilter || undefined}
        mixBlendMode={activeTheme.circleBlendMode || undefined}
        transition="background 0.25s ease, opacity 0.25s ease"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        bottom={circlePreset.bottomLeft.bottom}
        left={circlePreset.bottomLeft.left}
        w={circlePreset.bottomLeft.size}
        h={circlePreset.bottomLeft.size}
        borderRadius="full"
        bg={activeTheme.circleSecondaryBg || activeTheme.circleBg}
        opacity={activeTheme.circleSecondaryOpacity ?? circlePreset.bottomLeft.opacity}
        filter={activeTheme.circleSecondaryFilter || activeTheme.circleFilter || undefined}
        mixBlendMode={activeTheme.circleBlendMode || undefined}
        transition="background 0.25s ease, opacity 0.25s ease"
        pointerEvents="none"
      />
    </>
  ) : null;

  return (
    <>
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bgImage={`url('${activeTheme.brandImage || HEADER_BRAND_IMAGE}')`}
        bgPosition="center center"
        bgSize="cover"
        bgRepeat="no-repeat"
        opacity={activeTheme.imageOpacity ?? opacity}
        filter={activeTheme.imageFilter || "none"}
        transition="filter 0.25s ease, opacity 0.25s ease"
        pointerEvents="none"
        _after={
          showOverlay && activeTheme.overlayGradient
            ? {
                content: "''",
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: activeTheme.overlayGradient,
                transition: "background 0.25s ease",
              }
            : undefined
        }
      />
      {circlesLayer}
      {isChristmas && <ChristmasDecorationLayer variant={variant} />}
    </>
  );
}
