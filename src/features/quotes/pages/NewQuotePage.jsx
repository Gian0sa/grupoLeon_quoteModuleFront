import React from "react";
import { Box } from "@chakra-ui/react";
import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import SapQuotationForm from "../components/SapQuotationForm";
import { useAuthStore } from "../../auth/stores/useAuthStore";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function NewQuotesPage() {
  const { username, userId, role } = useAuthStore();
  const isAdmin = role === "ADMIN" || role === "FACTURACION" || username?.toLowerCase() === "enrique";
  const localUsername = localStorage.getItem("username") || localStorage.getItem("userId") || "Vendedor Autorizado";
  const activeSeller = !isAdmin ? (username || localUsername) : undefined;
  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });

  return (
    <Box w="full" minH="100vh" bg="gray.50" pb="100px">
      <TopHeaderBanner
        title="Nueva Cotización (Oferta de Venta)"
        subtitle={`Elaboración de Propuesta Comercial SAP • ${today.charAt(0).toUpperCase() + today.slice(1)}`}
        showBack={true}
        backTo="/historyquotes"
        showExchangeRate={true}
        mb={6}
      />

      <Box maxW="1200px" mx="auto" px={{ base: 3, md: 6 }} mt={-6}>
        <SapQuotationForm sellerName={activeSeller} />
      </Box>
    </Box>
  );
}

export default NewQuotesPage;