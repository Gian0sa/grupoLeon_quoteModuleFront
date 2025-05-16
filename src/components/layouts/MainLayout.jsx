import { Box, Flex } from "@chakra-ui/react";
import { Header } from "./Header";
import { Footer } from "./Footer";
import './MainLayout.css';

export function MainLayout({ children }) {
  return (
    <Flex direction="column" minHeight="100vh" >
      <Header/>
      <Box as="main" p={4} flex="1"className="background-image">
        <Box maxW="6xl" mx="auto" width="100%">
          {children}
        </Box>
      </Box>
      <Footer />
    </Flex>
  );
}
