import { 
  HStack, 
  IconButton, 
  Text, 
  useColorMode,
  Flex, 
  VStack,
} from "@chakra-ui/react"; 
import { MoonIcon, SunIcon ,BellIcon } from "@chakra-ui/icons";
import { LateralMenu } from "../../../src/features/dashboard/components/LateralMenu";
import { useAuthStore } from "../../features/auth/stores/useAuthStore"; 

export function Header() {
  const { colorMode, toggleColorMode } = useColorMode();
  const { username } = useAuthStore(); 

  return (
    <HStack as="header" justify="space-between" align="top" p={4} boxShadow="sm">
      <div>
         <Flex justify="space-between" align="center" mb={6}>
                    <VStack align="start" spacing={0}>
                      <Text fontSize="2xl" fontWeight="bold">
                        Hola, {username}.
                      </Text>
                      <Text fontSize="sm" opacity={0.9}>
                        Jueves, 17 de julio del 2025
                      </Text>
                    </VStack>
                  </Flex>
      </div>
      <div>
        <IconButton
          aria-label="Toggle Theme"
          icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
          onClick={toggleColorMode}
          variant="ghost"
        />
        <IconButton
          icon={<BellIcon />}
          colorScheme='teal'
          variant='ghost'
          aria-label='Notificaciones'
          onClick={() => console.log("Notificaciones")}
        />
        <LateralMenu />
      </div>
    </HStack>
  );
}
