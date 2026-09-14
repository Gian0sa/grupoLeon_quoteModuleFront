import { Box, Flex } from "@chakra-ui/react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function MainLayout({ children }) {
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
