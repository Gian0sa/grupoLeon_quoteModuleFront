import { 
  Card, 
  CardBody, 
  Flex, 
  VStack, 
  HStack, 
  Text, 
  Button, 
  Icon 
} from "@chakra-ui/react";
import { FiEye } from "react-icons/fi";

export function DebtCard({ debt, onViewInvoices, onViewDetails }) {
  return (
    <Card bg="green.50" border="1px" borderColor="green.100">
      <CardBody p={4}>
        <Flex justify="space-between" align="flex-end">
          <VStack align="flex-start" spacing={2} flex={1}>
            <Text fontSize="lg" fontWeight="bold" color="green.500">
              {debt.name}
            </Text>
            
            <VStack align="flex-start" spacing={1} fontSize="xs" color="gray.600">
              <HStack>
                <Text fontWeight="medium">RUC/DNI:</Text>
                <Text>{debt.ruc}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium">Monto pendiente:</Text>
                <Text>{debt.amount}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium">Cantidad de documentos:</Text>
                <Text>{debt.documents}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium">Documento más prox. a vencer:</Text>
                <Text>{debt.dueDate}</Text>
              </HStack>
            </VStack>
          </VStack>

          <VStack spacing={2} ml={4}>
            <Button
              size="sm"
              variant="outline"
              colorScheme="green"
              fontSize="xs"
              border="none"
              px={3}
              onClick={() => onViewInvoices?.(debt)}
            >
              Visualizar facturas
            </Button>
            <Button
              size="sm"
              colorScheme="green"
              rightIcon={<Icon as={FiEye} />}
              fontSize="xs"
              borderRadius="full"
              px={3}
              onClick={() => onViewDetails?.(debt)}
            >
              Ver detalles
            </Button>
          </VStack>
        </Flex>
      </CardBody>
    </Card>
  );
}
