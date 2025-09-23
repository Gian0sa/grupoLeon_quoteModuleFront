import "./App.css";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppRoutes from "./Routes";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import theme from "../components/theme";

const queryClient = new QueryClient();

function App() {
  return (
    <React.StrictMode>
      <ChakraProvider theme={theme}>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <QueryClientProvider client={queryClient}>
          <AppRoutes />
        </QueryClientProvider>
      </ChakraProvider>
    </React.StrictMode>
  );
}

export default App;
