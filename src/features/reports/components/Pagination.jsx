// Paginacion.jsx
import { Button, Flex, Text } from "@chakra-ui/react";
import React from "react";

export default function Paginacion({ totalPaginas, paginaActual, setPagina }) {
  return (
    <Flex justify="center" mt={4} gap={2} wrap="wrap">
      {Array.from({ length: totalPaginas }, (_, i) => i + 1)
        .filter((num) => num === 1 || num === totalPaginas || Math.abs(num - paginaActual) <= 2)
        .map((num, i, arr) => {
          const prevNum = arr[i - 1];
          const showDots = prevNum && num - prevNum > 1;
          return (
            <React.Fragment key={num}>
              {showDots && <Text px={2}>...</Text>}
              <Button
                size="sm"
                variant={num === paginaActual ? "solid" : "outline"}
                colorScheme="blue"
                onClick={() => setPagina(num)}
              >
                {num}
              </Button>
            </React.Fragment>
          );
        })}
    </Flex>
  );
}
