// src/components/layout/Header.jsx
import { HStack, IconButton, Text, useColorMode } from "@chakra-ui/react";
import { MoonIcon, SunIcon } from "@chakra-ui/icons";

export function Header() {
  const { colorMode, toggleColorMode } = useColorMode();

  return (
    <HStack as="header" justify="space-between" p={4} boxShadow="sm">
      <img src="/src/assets/logo.svg" alt="logo" width={100} />
      <IconButton
        aria-label="Toggle Theme"
        icon={colorMode === "light" ? <MoonIcon /> : <SunIcon />}
        onClick={toggleColorMode}
        variant="ghost"
      />
    </HStack>
  );
}
