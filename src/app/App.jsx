import "./App.css";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppRoutes from "./Routes";
import { ChakraProvider, ColorModeScript, useToast } from "@chakra-ui/react";
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
      networkMode: 'offlineFirst',
    },
    mutations: {
      retry: false,
      networkMode: 'offlineFirst',
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

/**
 * Gestor global de red: Cuando regresa el internet, dispara un refetch
 * silencioso e inmediato de todas las consultas activas en pantalla,
 * evitando que el usuario tenga que dar F5.
 */
function NetworkAutoRefresher() {
  const toast = useToast();

  useEffect(() => {
    const handleOnline = async () => {
      console.log("🌐 [Red] Conexión recuperada. Refrescando datos de todas las vistas activas...");

      try {
        // 1. Refrescar inmediatamente las consultas activas en la pantalla actual
        await queryClient.refetchQueries({ type: "active" }, { cancelRefetch: true });

        // 2. Marcar las demás consultas en segundo plano como stale para refrescarlas al navegar
        queryClient.invalidateQueries();

        // 3. Notificación amigable y discreta
        if (!toast.isActive("online-reconnected-toast")) {
          toast({
            id: "online-reconnected-toast",
            title: "Conexión restablecida",
            description: "La información en pantalla se ha actualizado automáticamente.",
            status: "success",
            duration: 3500,
            isClosable: true,
            position: "bottom-right",
          });
        }
      } catch (err) {
        console.warn("Error en auto-refetch al reconectar:", err);
      }
    };

    const handleOffline = () => {
      console.log("⚠️ [Red] Modo sin conexión activado.");
      if (!toast.isActive("offline-warning-toast")) {
        toast({
          id: "offline-warning-toast",
          title: "Modo sin conexión",
          description: "Sin acceso a internet. Puedes seguir navegando y guardando datos localmente.",
          status: "warning",
          duration: 4000,
          isClosable: true,
          position: "bottom-right",
        });
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [toast]);

  return null;
}

function App() {
  return (
    <>
      <ChakraProvider theme={theme}>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        <QueryClientProvider client={queryClient}>
          <NetworkAutoRefresher />
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

