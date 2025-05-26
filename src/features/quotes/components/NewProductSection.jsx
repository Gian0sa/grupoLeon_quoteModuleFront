import { useQuoteStore } from "../stores/quoteStore";
import {
  Box,
  Button,
  IconButton,
  Input,
  Table,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
  TableContainer,
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";

export function NewProductSection({ products }) {
    console.log(products)
  const removeProduct = useQuoteStore((state) => state.removeProduct);
  const updateProduct = useQuoteStore((state) => state.updateProduct);
  const navigate = useNavigate();

  return (
    <Box mt={6}>
      <Text fontSize="xl" fontWeight="bold" mb={4}>
        Productos en la cotización
      </Text>

      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Codigo</Th>
              <Th>Cantidad</Th>
              <Th>Precio $  </Th>
              <Th>Total $</Th>
            </Tr>
          </Thead>
          <Tbody>
            {products.map((product) => (
              <Tr key={product.id}>
                <Td>{product.id}<br></br>
                {product.name}
                </Td>
                <Td>
                  <Input
                    type="number"
                    min={1}
                    value={product.quantity}
                    onChange={(e) =>
                      updateProduct(product.id, {
                        quantity: parseInt(e.target.value),
                      })
                    }
                    size="sm"
                    width="40px"
                  />
                </Td>
                <Td>{Number(product.price).toFixed(2)}</Td>
                <Td>{(product.quantity * product.price).toFixed(2)}</Td>
                <Td>
                  <IconButton
                    icon={<DeleteIcon />}
                    colorScheme="red"
                    size="sm"
                    onClick={() => removeProduct(product.id)}
                    aria-label="Eliminar producto"
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>

      <Button mt={6} onClick={() => navigate("/products")} colorScheme="blue">
        Añadir producto
      </Button>
    </Box>
  );
}
