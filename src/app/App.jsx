import "./App.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppRoutes from "./Routes";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import theme from "../components/theme";
import { SyncQueueProvider } from "../features/checkinout/context/SyncQueueProvider";
import { useQuoteSocket } from "../features/quotes/hooks/useQuoteSocket";
import { useAuthStore } from "../features/auth/stores/useAuthStore";
import { usePresenceHeartbeat } from "../features/admin/hooks/usePresenceHeartbeat";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
      retry: false,
      retryOnMount: false,
      staleTime: 1000 * 60 * 5, // 5m
      gcTime: 1000 * 60 * 15, // 15m
      networkMode: 'online',
    },
    mutations: {
      retry: false,
    },
  },
});

function RealtimeSocketConsumer() {
  useQuoteSocket();
  usePresenceHeartbeat();
  return null;
}

function RealtimeSocketListener() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  if (!isAuthenticated) return null;
  return <RealtimeSocketConsumer />;
}

function App() {
  return (
    <>
      <ChakraProvider theme={theme}>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <QueryClientProvider client={queryClient}>
          <RealtimeSocketListener />
          {/* La cola de visitas offline vive aquí para seguir sincronizando
              en cualquier pantalla, no solo en el módulo de registro. */}
          <SyncQueueProvider>
            <AppRoutes />
          </SyncQueueProvider>
        </QueryClientProvider>
      </ChakraProvider>
    </>
  );
}

export default App;
