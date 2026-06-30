import { Box, Flex, Heading, Text, Image, Badge, SimpleGrid } from '@chakra-ui/react';

export default function ProductDetailInfo({ product, imageUrl, onImageClick }) {
  return (
    <Flex
      direction={{ base: 'column', md: 'row' }}
      bg="white" borderRadius="xl" overflow="hidden"
      shadow="md" borderWidth="1px" borderColor="gray.200"
    >
      <Box
        w={{ base: '100%', md: '300px' }} minH="250px"
        bg="gray.50" display="flex" alignItems="center" justifyContent="center"
        p={4} cursor={imageUrl ? "zoom-in" : "default"}
        onClick={() => imageUrl && onImageClick(imageUrl)}
      >
        {imageUrl ? (
          <Image src={imageUrl} alt={product.codigo} maxH="220px" objectFit="contain" />
        ) : (
          <Box textAlign="center" color="gray.400">
            <Text fontSize="4xl">📦</Text>
            <Text fontSize="sm">Sin imagen</Text>
          </Box>
        )}
      </Box>

      <Box flex="1" p={6}>
        <Flex gap={2} mb={2}>
          <Badge colorScheme="green" fontSize="md" px={3} py={1} borderRadius="full">
            {product.codigo || product.codigoLimpio}
          </Badge>
          {product.esPropio && <Badge colorScheme="blue" px={2}>PROPIO</Badge>}
        </Flex>

        <Heading size="md" mb={1}>{product.oem || product.oemLimpio || '-'}</Heading>

        <SimpleGrid columns={2} spacing={3} mt={4}>
          <InfoItem label="Marca" value={product.marca?.nombre} />
          <InfoItem label="Fabricante" value={product.fabricante?.nombre} />
          <InfoItem label="Tipo" value={product.tipo?.nombre} />
          <InfoItem label="Segmento" value={product.segmento?.nombre} />
          <InfoItem label="Categoría" value={product.categoria?.nombre} />
          <InfoItem label="Origen" value={product.documentoOrigen?.nombre} />
        </SimpleGrid>

        {product.medidas?.length > 0 && (
          <Box mt={4}>
            <Text fontWeight="bold" fontSize="sm" color="green.700" mb={2}>MEDIDAS</Text>
            <Box borderWidth="1px" borderRadius="md" overflow="hidden">
              <SimpleGrid columns={{ base: 1, md: 2 }} spacing={0}>
                {[...product.medidas]
                  .sort((a, b) => a.labelCaracteristica?.nombre?.localeCompare(b.labelCaracteristica?.nombre || '') || 0)
                  .map((m, i) => (
                  <Flex 
                    key={i} 
                    direction={{ base: 'column', md: 'row' }} 
                    borderBottomWidth="1px" 
                    borderRightWidth={{ base: '0', md: i % 2 === 0 ? "1px" : "0" }}
                  >
                    <Box bg="gray.50" px={3} py={{ base: 2, md: 1 }} w={{ base: '100%', md: '40%' }} fontWeight="medium" fontSize="sm">
                      {m.labelCaracteristica?.nombre}
                    </Box>
                    <Box px={3} py={{ base: 1, md: 1 }} flex="1" fontSize="sm">
                      {m.value} {m.unidadMedida?.nombre || ''}
                    </Box>
                  </Flex>
                ))}
              </SimpleGrid>
            </Box>
          </Box>
        )}
      </Box>
    </Flex>
  );
}

function InfoItem({ label, value }) {
  if (!value) return null;
  return (
    <Box>
      <Text fontSize="xs" color="gray.500" fontWeight="bold">{label}</Text>
      <Text fontSize="sm">{value}</Text>
    </Box>
  );
}
