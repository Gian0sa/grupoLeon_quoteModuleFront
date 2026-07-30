import { useState } from 'react';
import {
  Box, Flex, Text, SimpleGrid, Image, Badge, HStack
} from '@chakra-ui/react';
import { CheckCircleIcon } from '@chakra-ui/icons';

const BRANDS = [
  { id: 'acdelco', searchName: 'AC DELCO', name: 'ACDelco', logo: '/image/ac-delco-logo-png_seeklogo-2227.webp' },
  { id: 'wynns', searchName: "WYNN'S", name: "Wynn's", logo: '/image/wynns-logo-png_seeklogo-348583.webp' },
  { id: 'slime', searchName: 'SLIME', name: 'Slime', logo: '/image/logo-slime-header.webp' },
  { id: 'bosch', searchName: 'BOSCH', name: 'BOSCH', logo: '/image/bosh.webp' },
  { id: 'donaldson', searchName: 'DONALDSON', name: 'Donaldson', logo: '/image/Donaldson.webp' },
  { id: 'baldwin', searchName: 'BALDWIN', name: 'Baldwin', logo: '/image/BALDWIN_LOGO.webp' },
  { id: 'fram', searchName: 'FRAM', name: 'Fram', logo: '/image/fram.webp' },
  { id: 'mann', searchName: 'MANN FILTER', name: 'Mann Filter', logo: '/image/Mannfilter.webp' },
];

export default function BrandsShowcase({ onSelectBrand, selectedBrandId }) {
  const [failedLogos, setFailedLogos] = useState({});

  const handleImageError = (brandId) => {
    setFailedLogos(prev => ({ ...prev, [brandId]: true }));
  };

  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="2xl" p={4} shadow="sm" mb={4}>
      <Flex align="center" justify="space-between" pb={3} mb={3} borderBottomWidth="1px" borderColor="gray.100">
        <HStack spacing={2}>
          <Box w={2} h={5} bg="green.600" borderRadius="full" />
          <Text fontWeight="bold" fontSize="xs" textTransform="uppercase" letterSpacing="wider" color="gray.700">
            Nuestras Marcas Destacadas
          </Text>
        </HStack>
        <Badge colorScheme="green" variant="subtle" fontSize="10px" px={2.5} py={0.5} borderRadius="full">
          Filtrar por marca
        </Badge>
      </Flex>

      <SimpleGrid columns={{ base: 2, sm: 4, md: 8 }} spacing={3}>
        {BRANDS.map((b) => {
          const isSelected = selectedBrandId && (
            selectedBrandId.toString() === b.id || 
            selectedBrandId.toString() === b.searchName ||
            selectedBrandId.toString().toLowerCase() === b.name.toLowerCase()
          );
          const hasError = failedLogos[b.id];

          return (
            <Box
              as="button"
              type="button"
              key={b.id}
              onClick={() => onSelectBrand && onSelectBrand(b)}
              title={`Filtrar por ${b.name}`}
              position="relative"
              display="flex"
              alignItems="center"
              justifyContent="center"
              p={2}
              h="64px"
              borderRadius="xl"
              borderWidth="1px"
              bg="white"
              borderColor={isSelected ? "green.500" : "gray.200"}
              shadow={isSelected ? "md" : "xs"}
              transform={isSelected ? "scale(1.03)" : "none"}
              transition="all 0.25s ease-in-out"
              cursor="pointer"
              overflow="hidden"
              _hover={{
                borderColor: "green.500",
                shadow: "md",
                transform: "scale(1.05)"
              }}
            >
              {hasError ? (
                <Text fontSize="xs" fontWeight="black" textTransform="uppercase" color="gray.700" textAlign="center">
                  {b.name}
                </Text>
              ) : (
                <Image
                  src={b.logo}
                  alt={b.name}
                  maxH="44px"
                  w="full"
                  objectFit="contain"
                  p={1}
                  filter={isSelected ? "grayscale(0%) opacity(100%)" : "grayscale(100%) opacity(75%)"}
                  transition="all 0.25s ease-in-out"
                  _hover={{
                    filter: "grayscale(0%) opacity(100%)"
                  }}
                  onError={() => handleImageError(b.id)}
                />
              )}

              {isSelected && (
                <Box position="absolute" top={1} right={1}>
                  <CheckCircleIcon color="green.500" boxSize={3.5} />
                </Box>
              )}
            </Box>
          );
        })}
      </SimpleGrid>
    </Box>
  );
}
