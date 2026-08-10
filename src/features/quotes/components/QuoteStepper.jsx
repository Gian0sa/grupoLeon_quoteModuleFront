import React from "react";
import { Box, Flex, Text, HStack } from "@chakra-ui/react";
import { Check, Send, Clock, CheckCircle2, XCircle } from "lucide-react";

export const STAGES = [
  { id: "GENERADO", label: "Generado", icon: Check },
  { id: "ENVIADO", label: "Enviado", icon: Send },
  { id: "EN_PROCESO", label: "En Proceso", icon: Clock },
  { id: "APROBADO", label: "Aprobado", icon: CheckCircle2 }
];

export function getStageIndex(status) {
  if (status === "RECHAZADO") return -1;
  switch (status) {
    case "GENERADO":
    case "DRAFT":
    case "draft":
      return 0;
    case "ENVIADO":
      return 1;
    case "EN_PROCESO":
    case "PENDIENTE":
      return 2;
    case "APROBADO":
    case "COMPLETADO":
      return 3;
    default:
      return 0;
  }
}

export function QuoteStepper({ status = "GENERADO", isCompact = false }) {
  const currentIndex = getStageIndex(status);
  const isRejected = status === "RECHAZADO";

  if (isRejected) {
    return (
      <HStack spacing={2} bg="red.50" px={3} py={1} borderRadius="full" border="1px solid" borderColor="red.200" display="inline-flex">
        <XCircle className="w-4 h-4 text-red-600" />
        <Text fontSize="xs" fontWeight="800" color="red.700">
          Rechazado
        </Text>
      </HStack>
    );
  }

  return (
    <Box w="full" maxW={isCompact ? "240px" : "320px"}>
      <Flex align="center" justify="space-between" position="relative">
        {/* Línea de Fondo */}
        <Box
          position="absolute"
          top="14px"
          left="16px"
          right="16px"
          h="3px"
          bg="gray.200"
          zIndex={0}
          borderRadius="full"
        />

        {/* Línea de Avance */}
        <Box
          position="absolute"
          top="14px"
          left="16px"
          h="3px"
          bg="emerald.500"
          zIndex={0}
          borderRadius="full"
          transition="width 0.4s ease"
          style={{
            width: currentIndex === 0 ? "0%" : currentIndex === 1 ? "33%" : currentIndex === 2 ? "66%" : "100%"
          }}
        />

        {/* Pasos / Círculos */}
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const Icon = stage.icon;

          return (
            <Flex key={stage.id} direction="column" align="center" zIndex={1} position="relative">
              <Flex
                w={isCompact ? "26px" : "28px"}
                h={isCompact ? "26px" : "28px"}
                borderRadius="full"
                align="center"
                justify="center"
                bg={
                  isCompleted
                    ? "emerald.500"
                    : isCurrent
                    ? "blue.500"
                    : "gray.100"
                }
                color={isCompleted || isCurrent ? "white" : "gray.400"}
                border="2px solid"
                borderColor={
                  isCompleted
                    ? "emerald.600"
                    : isCurrent
                    ? "blue.600"
                    : "gray.300"
                }
                boxShadow={isCurrent ? "0 0 0 3px rgba(59, 130, 246, 0.25)" : "none"}
                transition="all 0.3s ease"
              >
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  <Icon className="w-3.5 h-3.5" />
                )}
              </Flex>

              {!isCompact && (
                <Text
                  mt={1}
                  fontSize="10px"
                  fontWeight={isCurrent ? "800" : "600"}
                  color={isCompleted ? "emerald.800" : isCurrent ? "blue.700" : "gray.400"}
                  whiteSpace="nowrap"
                >
                  {stage.label}
                </Text>
              )}
            </Flex>
          );
        })}
      </Flex>
    </Box>
  );
}

export default QuoteStepper;
