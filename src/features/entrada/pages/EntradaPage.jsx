import { Box, Container, Center } from '@chakra-ui/react';
import { EntradaForm } from '../components/EntradaForm';

export const EntradaPage = () => {
  return (
    <Box bg="gray.50" minH="100vh" w="100%">
      <Container maxW="container.lg" py={10}>
        <Center minH="80vh">
          <EntradaForm />
        </Center>
      </Container>
    </Box>
  );
};
