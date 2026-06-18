import { Box, Flex, VStack, SimpleGrid, Skeleton, SkeletonText } from '@chakra-ui/react';

export default function ProductDetailSkeleton() {
  return (
    <Box>
      <Flex
        direction={{ base: 'column', md: 'row' }}
        bg="white" borderRadius="xl" overflow="hidden"
        shadow="md" borderWidth="1px" borderColor="gray.200"
        mb={8}
      >
        <Box w={{ base: '100%', md: '300px' }} minH="250px" bg="gray.50" p={4}>
          <Skeleton height="220px" width="100%" />
        </Box>
        <Box flex="1" p={6}>
          <Flex gap={2} mb={2}>
            <Skeleton height="24px" width="100px" borderRadius="full" />
          </Flex>
          <Skeleton height="32px" width="200px" mb={4} />
          <SimpleGrid columns={2} spacing={3} mt={4}>
            <Skeleton height="20px" width="80%" />
            <Skeleton height="20px" width="80%" />
            <Skeleton height="20px" width="80%" />
            <Skeleton height="20px" width="80%" />
          </SimpleGrid>
          <Box mt={4}>
            <Skeleton height="20px" width="100px" mb={2} />
            <Box borderWidth="1px" borderRadius="md" overflow="hidden" p={2}>
              <SkeletonText noOfLines={4} spacing="4" skeletonHeight="2" />
            </Box>
          </Box>
        </Box>
      </Flex>
      <Box bg="white" borderRadius="xl" shadow="md" borderWidth="1px" overflow="hidden" mb={8}>
        <Box bg="green.700" px={4} py={2}>
          <Skeleton height="20px" width="100px" />
        </Box>
        <Box p={4}>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={3}>
            <Skeleton height="80px" borderRadius="md" />
            <Skeleton height="80px" borderRadius="md" />
            <Skeleton height="80px" borderRadius="md" />
          </SimpleGrid>
        </Box>
      </Box>
    </Box>
  );
}
