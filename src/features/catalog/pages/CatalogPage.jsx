import { useState } from 'react';
import { Container, VStack, Heading, Text, SimpleGrid, Spinner, Alert, AlertIcon, AlertTitle, AlertDescription , Flex } from '@chakra-ui/react';
import { useProducts, useSearchProducts } from "../hooks/queries/catalogQueries";
import CatalogSearchBar from "../components/CatalogSearchBar";
import ProductCard from "../components/ProductCard";
import EmptyState from "../components/EmptyState";
import { Button } from "@chakra-ui/react";
import { Link } from "react-router-dom";

export default function CatalogPage() {
  const [searchParams, setSearchParams] = useState({ query: '', year: '' });

  const { data: allProducts, isLoading: isLoadingAll, error: errorAll } = useProducts();
  const { data: searchResults, isLoading: isLoadingSearch, error: errorSearch } = useSearchProducts(searchParams);

  const hasActiveSearch = searchParams.query || searchParams.year;
  const data = hasActiveSearch ? searchResults : allProducts;
  const isLoading = hasActiveSearch ? isLoadingSearch : isLoadingAll;
  const error = hasActiveSearch ? errorSearch : errorAll;

  const handleSearch = (params) => setSearchParams(params);

  if (isLoading) {
    return (
      <Container maxW="container.xl" py={8}>
        <VStack spacing={4}>
          <Spinner size="xl" color="red.500" thickness="4px" />
          <Text>Cargando productos...</Text>
        </VStack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertTitle>Error al cargar productos</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
    
      <VStack spacing={6} align="stretch">
        <Flex gap={3} align="center">
        {/* Header */}
        <Heading size="xl" mb={2} color="gray.800">Catálogo de Productos</Heading>
        <Link to="/catalog/create">
            <Button _hover="none" background="green.700" borderRadius="full" color="white" px={5} py={2}>+ Nuevo producto</Button>
        </Link></Flex>
        <Text color="gray.600">
          {data?.length || 0} producto{data?.length !== 1 ? 's' : ''} 
          {hasActiveSearch ? ' encontrado' : ' disponible'}{data?.length !== 1 ? 's' : ''}
        </Text>

        {/* Barra de búsqueda */}
        <CatalogSearchBar onSearch={handleSearch} isLoading={isLoading} />

        {/* Lista de productos */}
        {data?.length > 0 ? (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
            {data.map((product) => <ProductCard key={product.id} product={product} />)}
          </SimpleGrid>
        ) : (
          <EmptyState hasActiveSearch={hasActiveSearch} />
        )}
      </VStack>
    </Container>
  );
}
