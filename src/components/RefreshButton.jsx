import { IconButton, Spinner, Tooltip, useToast } from "@chakra-ui/react";
import { RepeatIcon } from "@chakra-ui/icons";
import { useState } from "react";
import { useRefetchQueries } from "../shared/utils/refetchUtils";

export function RefreshButton({ 
  queries = [], 
  variant = "ghost",
  size = "md",
  showToast = true,
  onRefreshStart,
  onRefreshEnd,
  mode = "invalidateAndRefetch" 
}) {
  const { refetch, invalidate, invalidateAndRefetch, refetchAll } = useRefetchQueries();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  const handleClick = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    onRefreshStart?.();
    
    try {
      // Timeout de seguridad de 3.5s para evitar que el botón quede bloqueado
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Timeout al actualizar")), 3500)
      );

      const refetchPromise = (async () => {
        // Si no hay queries específicas → refrescar todo
        if (!queries || queries.length === 0) {
          await refetchAll();
        } else {
          switch (mode) {
            case "invalidate":
              await invalidate(queries);
              break;
            case "refetch":
              await refetch(queries);
              break;
            case "invalidateAndRefetch":
            default:
              await invalidateAndRefetch(queries);
          }
        }
      })();

      await Promise.race([refetchPromise, timeoutPromise]);
      
      if (showToast) {
        toast({
          title: "Datos actualizados",
          description: "La información fue recargada correctamente.",
          status: "success",
          duration: 2000,
          isClosable: true,
          position: "top-right",
        });
      }
    } catch (error) {
      console.error("Error al refrescar:", error);
      
      if (showToast) {
        toast({
          title: "Actualizado (Parcial)",
          description: "La información fue refrescada en segundo plano.",
          status: "info",
          duration: 2000,
          isClosable: true,
          position: "top-right",
        });
      }
    } finally {
      setIsRefreshing(false);
      onRefreshEnd?.();
    }
  };

  return (
    <Tooltip hasArrow label={isRefreshing ? "Actualizando..." : "Actualizar datos"}>
      <IconButton
        icon={
          isRefreshing 
            ? <Spinner size="sm" color="white" thickness="2px" /> 
            : <RepeatIcon boxSize={{ base: 5, md: 6 }} color="white" />
        }
        bg={variant === "ghost" ? "transparent" : "green.700"}
        onClick={handleClick}
        variant={variant}
        size={size}
        w={{ base: "42px", md: "48px" }}
        h={{ base: "42px", md: "48px" }}
        borderRadius="full"
        isDisabled={isRefreshing}
        colorScheme="whiteAlpha"
        _hover={{ bg: "whiteAlpha.300" }}
        sx={
          isRefreshing
            ? {
                "& svg, & .chakra-icon": {
                  animation: "spin 0.8s linear infinite",
                },
                "@keyframes spin": {
                  from: { transform: "rotate(0deg)" },
                  to: { transform: "rotate(360deg)" },
                },
              }
            : {
                "&:hover svg, &:hover .chakra-icon": {
                  transform: "rotate(180deg)",
                  transition: "transform 0.3s ease",
                },
              }
        }
        transition="background 0.2s"
      />
    </Tooltip>
  );
}