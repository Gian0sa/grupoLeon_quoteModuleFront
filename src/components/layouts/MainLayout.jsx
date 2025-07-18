import { Box, Flex } from "@chakra-ui/react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import styles from "./MainLayout.module.css";
import { useEffect } from "react";

export function MainLayout({ children }) {
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
  
    window.addEventListener("beforeunload", handleBeforeUnload);
  
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);
  return (
    <Flex direction="column" minHeight="100vh" >
      <Header/>
      <Box as="main" flex="1">
        <Box width="100vw">
          {children}
        </Box>
      </Box>
      <Footer />
    </Flex>
  );
}
