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
  TableContainer, 
  FormControl, 
  FormLabel,
  useDisclosure,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  InputGroup,
  InputRightElement,
  Tfoot
} from "@chakra-ui/react";
import { ProductDetail } from "../../products/components/ProductDetail";
import { DeleteIcon , Search2Icon} from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

export function NewProductSection({ products }) {
  console.log(products)
  const removeProduct = useQuoteStore((state) => state.removeProduct);
  const updateProduct = useQuoteStore((state) => state.updateProduct);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [searchCode, setSearchCode] = useState("");
  const [submittedCode, setSubmittedCode] = useState("");
  const totalFinal = products.reduce(
      (sum, product) => sum + product.quantity * product.importe,
      0
    );



  const navigate = useNavigate();
  const handleSubmit = (e) => {
    e.preventDefault();
    const value = e.target.search.value.trim();
    if (!value) return;
    setSubmittedCode(value);
    onOpen();
  };

  return (
    <Box mt={6}>
      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Detalle</Th>
              <Th>Cantidad</Th>
              <Th>Precio $ </Th>
              <Th>Total $</Th>
            </Tr>
          </Thead>
          <Tbody>
            {products.map((product) => (
              <Tr key={product.id}>
                <Td>
                  {product.id}
                  <br></br>
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
                    width="60px"
                  />
                </Td>
                <Td>{Number(product.importe).toFixed(2)}</Td>
                <Td>{(product.quantity * product.importe).toFixed(2)}</Td>
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
          <Tbody>
            <Tr>
              <Td>
                <form onSubmit={handleSubmit}>
                  <FormControl>
                    <InputGroup size="md">
                      <Input
                        type="text"
                        name="search"
                        placeholder="Ej: DL-3001"
                        pr="2.5rem"
                        value={searchCode}
                        onChange={(e) => setSearchCode(e.target.value)}
                      />
                      <InputRightElement width="2.5rem">
                        <IconButton
                          icon={<Search2Icon />}
                          size="sm"
                          type="submit"
                          aria-label="Buscar producto"
                          colorScheme="blue"
                        />
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>
                </form>
              </Td>
            </Tr>
          </Tbody>
          <Tfoot>
            <Tr>
              <Td colSpan={3} textAlign="right" fontWeight="bold">
                Total Final sin IGV:
              </Td>
              <Td colSpan={2} fontWeight="bold">
                ${totalFinal.toFixed(2)}
              </Td>
            </Tr>
             <Tr>
              <Td colSpan={3} textAlign="right" fontWeight="bold">
                Total Final con IGV:
              </Td>
              <Td colSpan={2} fontWeight="bold">
                ${totalFinal.toFixed(2)}
              </Td>
            </Tr>
             <Tr>
              <Td colSpan={3} textAlign="right" fontWeight="bold">
                Total Final Soles:
              </Td>
              <Td colSpan={2} fontWeight="bold">
                ${totalFinal.toFixed(2)}
              </Td>
            </Tr>
          </Tfoot>

        </Table>
      </TableContainer>

      <Button mt={6} onClick={() => navigate("/products")} colorScheme="blue">
        ir al Catalogo
      </Button>

      <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Detalles del producto</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {submittedCode && (
            <ProductDetail
              code={{ value: submittedCode }}
              onSuccess={() => {
                onClose();
                setSearchCode("");
                setSubmittedCode("");
              }}
            />
          )}
        </ModalBody>
      </ModalContent>
    </Modal>

    </Box>
    
  );
}

