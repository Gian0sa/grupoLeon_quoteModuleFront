import { Box, Flex } from "@chakra-ui/react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import styles from "./MainLayout.module.css";
import { useEffect } from "react";

export function MainLayout({ children }) {
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ""; // Requerido para activar el diálogo de confirmación en la mayoría de navegadores
    };
  
    window.addEventListener("beforeunload", handleBeforeUnload);
  
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
  return (
    <Flex direction="column" minHeight="100vh" >
      <Header/>
      <Box as="main" p={4} flex="1">
        <Box maxW="6xl" mx="auto" width="100%">
          {children}
        </Box>
      </Box>
      <Footer />
    </Flex>
  );
}
