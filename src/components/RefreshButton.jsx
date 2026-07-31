import { IconButton, Spinner, Tooltip, useToast } from "@chakra-ui/react";
import { RepeatIcon } from "@chakra-ui/icons";
import { useState } from "react";
import { useRefetchQueries } from "../shared/utils/refetchUtils";

export function RefreshButton({ 
  queries = [], 
  variant = "ghost",
  size = "md",
  showToast = false,
  onRefreshStart,
  onRefreshEnd,
  mode = "refetch" 
}) {
  const { refetch, invalidate, invalidateAndRefetch } = useRefetchQueries();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const toast = useToast();

  const handleClick = async () => {
    setIsRefreshing(true);
    onRefreshStart?.();
    
    try {
      switch (mode) {
        case "invalidate":
          await invalidate(queries);
          break;
        case "invalidateAndRefetch":
          await invalidateAndRefetch(queries);
          break;
        default:
          await refetch(queries);
      }
      
      if (showToast) {
        toast({
          title: "Datos actualizados",
          status: "success",
          duration: 2000,
          isClosable: true,
        });
      }
    } catch (error) {
      console.error("Error al refrescar:", error);
      
      if (showToast) {
        toast({
          title: "Error al actualizar",
          description: "No se pudieron actualizar los datos",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    } finally {
      setIsRefreshing(false);
      onRefreshEnd?.();
    }
  };

  return (
    <Tooltip hasArrow label="Actualizar datos">
      <IconButton
        icon={isRefreshing ? <Spinner size="md" color="white" /> : <RepeatIcon boxSize={{ base: 5, md: 6 }} color="white" />}
        bg={variant === "ghost" ? "transparent" : "green.700"}
        onClick={handleClick}
        variant={variant}
        size={size}
        w={{ base: "42px", md: "48px" }}
        h={{ base: "42px", md: "48px" }}
        borderRadius="full"
        isDisabled={isRefreshing}
        colorScheme="whiteAlpha"
        _hover={{ bg: "whiteAlpha.300", transform: isRefreshing ? "none" : "rotate(180deg)" }}
        transition="transform 0.2s, background 0.2s"
      />
    </Tooltip>
  );
}