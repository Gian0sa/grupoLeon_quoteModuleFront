import { Box, Center } from '@chakra-ui/react';
import { TopHeaderBanner } from '../../../components/TopHeaderBanner';
import { EntradaForm } from '../components/EntradaForm';

export const EntradaPage = () => {
  return (
    <Box bg="gray.50" minH="100vh" w="100%" pb="120px">
      <TopHeaderBanner
        title="Control de Asistencia"
        subtitle="Registro de marcado de ingreso y geolocalización"
        showBack={true}
        mb={6}
      />
      <Box maxW="1200px" mx="auto" px={4}>
        <Center minH="60vh">
          <EntradaForm />
        </Center>
      </Box>
    </Box>
  );
};
