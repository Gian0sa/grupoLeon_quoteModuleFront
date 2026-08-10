import React from "react";
import { Box, Flex, Text, Badge } from "@chakra-ui/react";
import { motion } from "framer-motion";
import { FlaskConical, ShieldCheck, Sparkles } from "lucide-react";

const MotionBox = motion(Box);

export function TestModeBanner() {
  return (
    <MotionBox
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      mb={{ base: 4, md: 6 }}
      p={{ base: 3.5, md: 4 }}
      borderRadius="2xl"
      bg="linear-gradient(135deg, #064e3b 0%, #047857 50%, #059669 100%)"
      color="white"
      boxShadow="0 10px 25px -5px rgba(5, 150, 105, 0.35)"
      position="relative"
      overflow="hidden"
      border="1px solid"
      borderColor="emerald.400"
    >
      {/* Círculo decorativo translúcido */}
      <Box
        position="absolute"
        right="-20px"
        top="-20px"
        w="120px"
        h="120px"
        borderRadius="full"
        bg="whiteAlpha.100"
        pointerEvents="none"
      />

      <Flex align={{ base: "flex-start", sm: "center" }} direction={{ base: "column", sm: "row" }} gap={3}>
        <Flex
          w={{ base: "38px", md: "44px" }}
          h={{ base: "38px", md: "44px" }}
          borderRadius="xl"
          bg="whiteAlpha.200"
          backdropFilter="blur(10px)"
          align="center"
          justify="center"
          flexShrink={0}
          boxShadow="inner"
        >
          <FlaskConical className="w-5 h-5 text-emerald-200 animate-pulse" />
        </Flex>

        <Box flex="1">
          <Flex align="center" gap={2} flexWrap="wrap" mb={0.5}>
            <Text fontWeight="800" fontSize={{ base: "sm", md: "md" }} letterSpacing="tight">
              MODO PRUEBAS ACTIVO (Entorno Sandbox)
            </Text>
            <Badge
              bg="emerald.300"
              color="emerald.950"
              fontWeight="800"
              fontSize="10px"
              px={2.5}
              py={0.5}
              borderRadius="full"
              display="flex"
              alignItems="center"
              gap={1}
            >
              <ShieldCheck className="w-3 h-3" /> Sin Riesgo
            </Badge>
          </Flex>
          <Text fontSize={{ base: "xs", md: "sm" }} color="emerald.50" fontWeight="400" lineHeight="short">
            Consultas de catálogo y stock en tiempo real. Las aprobaciones y guardados simularán la transacción sin modificar ni alterar datos de SAP Business One.
          </Text>
        </Box>
      </Flex>
    </MotionBox>
  );
}
