import { Button, Flex } from "@chakra-ui/react";

export default function Pagination({ paginaActual, hasMore, setPagina }) {
  // Genera botones desde la página 1 hasta la actual
  const paginas = Array.from({ length: paginaActual }, (_, i) => i + 1);

  return (
    <Flex justify="center" mt={4} gap={2} wrap="wrap">
      {paginas.map((num) => (
        <Button
          key={num}
          size="sm"
          variant={num === paginaActual ? "solid" : "outline"}
          colorScheme="blue"
          onClick={() => setPagina(num)}
        >
          {num}
        </Button>
      ))}

      {hasMore && (
        <Button
          size="sm"
          variant="outline"
          colorScheme="blue"
          onClick={() => setPagina(paginaActual + 1)}
        >
          {paginaActual + 1}
        </Button>
      )}
    </Flex>
  );
}
