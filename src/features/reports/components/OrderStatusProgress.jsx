import {
  Box,
  CircularProgress,
  CircularProgressLabel,
  Text,
  VStack,
} from "@chakra-ui/react";

export default function OrderStatusProgress({ estadoMeta, estadoOrden }) {
  const percent = estadoMeta?.progress ?? 0;
  const color = estadoMeta?.color ?? "gray";

  return (
    <VStack spacing={1} align="center" maxW="100px" w="100px">
      <CircularProgress
        value={percent}
        size="100px"
        thickness="6px"
        color={`${color}`}
      >
        <CircularProgressLabel fontWeight="bold">
          {percent}%
        </CircularProgressLabel>
      </CircularProgress>
     
      <Text
        fontSize="xs"
        color="gray.600"
        whiteSpace="normal"
        wordBreak="break-word"
        textAlign="center"
        w="100%"
      >
        {estadoOrden}
      </Text>
    </VStack>
  );
}