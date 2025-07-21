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
import { format } from "date-fns";
import { es } from "date-fns/locale"; // Si quieres formato en español



export function Header() {
  const { colorMode, toggleColorMode } = useColorMode();
  const { username } = useAuthStore(); 
  const today = format(new Date(), "EEEE, d 'de' MMMM 'del' yyyy", { locale: es });
  return (
    <HStack as="header" justify="space-between" align="top" p={4} boxShadow="sm">
      <div>
         <Flex justify="space-between" align="center" mb={6}>
                    <VStack align="start" spacing={0}>
                      <Text fontSize="2xl" fontWeight="bold">
                        Hola, {username}.
                      </Text>
                      <Text fontSize="sm" opacity={0.9}>
                        {today.charAt(0).toUpperCase() + today.slice(1)}
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
