import React from "react";
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
export function HeaderBrandWatermark({
  theme,
  opacity = 0.4,
  showOverlay = false,
  showCircles = false,
  variant = "banner",
}) {
  const activeTheme = theme?.key ? theme : (theme || getHeaderThemeConfig("green"));
  const circlePreset = CIRCLE_VARIANTS[variant] || CIRCLE_VARIANTS.banner;

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
    </>
  );
}
