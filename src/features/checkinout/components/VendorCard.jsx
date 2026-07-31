import { Box, HStack, VStack, Text, Image, Badge, useColorModeValue } from "@chakra-ui/react";

export function VendorCard({ username }) {
  const cardBg = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.100", "gray.700");

  return (
    <Box
      bg={cardBg}
      borderRadius="2xl"
      p={5}
      boxShadow="0 8px 24px rgba(0,0,0,0.04)"
      border="1px solid"
      borderColor={borderColor}
    >
      <HStack spacing={4} align="center">
        <Box position="relative">
          <Box
            p="2px"
            borderRadius="full"
            bg="linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)"
            boxShadow="0 4px 12px rgba(22, 101, 52, 0.25)"
          >
            <Image
              src="/assets/icons/avatar.jpg"
              boxSize="52px"
              borderRadius="full"
              objectFit="cover"
              alt="Vendedor"
            />
          </Box>
          <Box
            position="absolute"
            bottom="2px"
            right="2px"
            w="12px"
            h="12px"
            borderRadius="full"
            bg="green.500"
            border="2px solid white"
            boxShadow="0 0 8px rgba(34, 197, 94, 0.6)"
          />
        </Box>

        <VStack align="start" spacing={0.5} flex="1">
          <Text fontSize="xs" fontWeight="700" color="gray.400" textTransform="uppercase" letterSpacing="wider">
            Vendedor Registrado
          </Text>
          <Text fontSize="md" fontWeight="800" color="gray.800">
            {username || "Vendedor"}
          </Text>
          <HStack spacing={2} pt={0.5}>
            <Badge
              bg="green.50"
              color="green.700"
              px={2.5}
              py={0.5}
              borderRadius="full"
              fontSize="10px"
              fontWeight="700"
              border="1px solid"
              borderColor="green.200"
            >
              Asesor de Ventas
            </Badge>
          </HStack>
        </VStack>
      </HStack>
    </Box>
  );
}