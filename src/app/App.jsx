import "./App.css";
import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppRoutes from "./Routes";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import theme from "../components/theme";
import { SyncQueueProvider } from "../features/checkinout/context/SyncQueueProvider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
      retry: false,
      retryOnMount: false,
      staleTime: 1000 * 60 * 60,
      gcTime: 1000 * 60 * 60,
      networkMode: 'online',
    },
    mutations: {
      retry: false,
    },
  },
});

function App() {
  return (
    <React.StrictMode>
      <ChakraProvider theme={theme}>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <QueryClientProvider client={queryClient}>
          {/* La cola de visitas offline vive aquí para seguir sincronizando
              en cualquier pantalla, no solo en el módulo de registro. */}
          <SyncQueueProvider>
            <AppRoutes />
          </SyncQueueProvider>
        </QueryClientProvider>
      </ChakraProvider>
    </React.StrictMode>
  );
}

export default App;
