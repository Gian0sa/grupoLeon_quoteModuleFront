import { Alert, AlertIcon, AlertTitle, AlertDescription } from '@chakra-ui/react';

export default function EmptyState({ hasActiveSearch }) {
  return (
    <Alert status={hasActiveSearch ? "warning" : "info"} borderRadius="md">
      <AlertIcon />
      <AlertTitle>
        {hasActiveSearch ? "No se encontraron productos" : "No hay productos disponibles"}
      </AlertTitle>
      <AlertDescription>
        {hasActiveSearch 
          ? "Intenta con otros términos de búsqueda o filtros." 
          : "No se encontraron productos en el catálogo."}
      </AlertDescription>
    </Alert>
  );
}
