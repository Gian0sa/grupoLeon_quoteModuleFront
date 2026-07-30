import { Box, HStack, Heading, Badge, Text } from '@chakra-ui/react';
import { Tag } from 'lucide-react';

export default function ProductHeader({ product }) {
  return (
    <Box
      bg="linear-gradient(135deg, #15803d 0%, #166534 100%)"
      color="white"
      px={4}
      py={2.5}
      borderTopRadius="xl"
    >
      <HStack justify="space-between" align="center">
        <HStack spacing={2}>
          <Box p={1} borderRadius="md" bg="whiteAlpha.200">
            <Tag size={16} color="white" />
          </Box>
          <Text fontSize={{ base: "md", md: "lg" }} fontWeight="800" letterSpacing="tight">
            {product.itemCode || product.id}
          </Text>
        </HStack>

        {product.isActive && (
          <Badge
            bg="whiteAlpha.25"
            color="white"
            borderRadius="full"
            px={3}
            py={0.5}
            fontSize="10px"
            fontWeight="700"
            border="1px solid rgba(255,255,255,0.3)"
            backdropFilter="blur(4px)"
          >
            ACTIVO
          </Badge>
        )}
      </HStack>
    </Box>
  );
}
