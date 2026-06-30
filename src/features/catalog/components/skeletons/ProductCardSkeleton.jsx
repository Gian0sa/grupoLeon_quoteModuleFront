import { Card, CardBody, Stack, Box, Skeleton, SkeletonText, Flex } from '@chakra-ui/react';

export default function ProductCardSkeleton() {
  return (
    <Card overflow="hidden" borderWidth="1px" borderColor="gray.200" borderRadius="lg">
      <Box bg="green.700" px={4} py={2}>
        <Flex justify="space-between">
          <Skeleton height="24px" width="120px" />
        </Flex>
      </Box>
      <CardBody p={0}>
        <Stack spacing={0}>
          <Box bg="green.100" px={4} py={2}>
            <Skeleton height="20px" width="60px" mx="auto" />
          </Box>
          <Box px={4} py={2}>
            <SkeletonText mt="4" noOfLines={4} spacing="4" skeletonHeight="2" />
          </Box>
          <Box p={4} textAlign="center">
            <Skeleton height="150px" width="100%" />
          </Box>
        </Stack>
      </CardBody>
    </Card>
  );
}
