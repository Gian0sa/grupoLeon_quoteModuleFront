import { 
  Flex, 
  Button, 
  HStack, 
  Box 
} from "@chakra-ui/react";

export function ListHeader({ 
  pagination,
  onPageChange,
}) {
  const {
    paginaActual = 1,
    totalPaginas = 1,
    totalClientes = 0,
    rango = { desde: 1, hasta: 0 }
  } = pagination || {};

  // ✅ Nueva función robusta de paginación
  const generarRangoPaginas = (paginaActual, totalPaginas) => {
    const delta = 2; // cantidad de páginas antes y después de la actual
    const pages = [];

    const start = Math.max(2, paginaActual - delta);
    const end = Math.min(totalPaginas - 1, paginaActual + delta);

    pages.push(1); // siempre mostrar la página 1

    if (start > 2) {
      pages.push("...");
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (end < totalPaginas - 1) {
      pages.push("...");
    }

    if (totalPaginas > 1) {
      pages.push(totalPaginas); // siempre mostrar la última página
    }

    return pages;
  };

  return (
    <Box mb={4} mt={5}>
      {totalClientes > 0 && (
        <Flex justify="space-between" align="center" mb={2}>

          <HStack spacing={1}>
            {generarRangoPaginas(paginaActual, totalPaginas).map((p, idx) =>
              p === "..." ? (
                <Box key={`ellipsis-${idx}`} px={2}>
                  ...
                </Box>
              ) : (
                <Button
                  key={`page-${p}`}
                  size="sm"
                  variant={p === paginaActual ? "solid" : "outline"}
                  colorScheme={p === paginaActual ? "blue" : "gray"}
                  onClick={() => onPageChange(p)}
                >
                  {p}
                </Button>
              )
            )}
          </HStack>
        </Flex>
      )}
    </Box>
  );
}
