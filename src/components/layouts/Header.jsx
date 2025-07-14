// src/components/layout/Header.jsx
import { HStack, IconButton, Text, useColorMode } from "@chakra-ui/react";
import { MoonIcon, SunIcon ,BellIcon } from "@chakra-ui/icons";
import { LateralMenu } from "../../../src/features/dashboard/components/LateralMenu";

export function Header() {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <HStack as="header" justify="space-between" p={4} boxShadow="sm">
      <div>
        <img src="/src/assets/logo.svg" alt="logo" width={100} />
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
