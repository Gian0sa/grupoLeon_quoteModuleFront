import React, { useState } from "react";
import {
  Box,
  Flex,
  HStack,
  Text,
  Badge,
  Avatar,
  Spinner,
  Menu,
  MenuButton,
  MenuList,
  Portal,
  SimpleGrid,
  Button,
  IconButton,
  Tooltip,
  useToast,
} from "@chakra-ui/react";
import { ShieldCheck, ChevronDown, Check, RotateCcw } from "lucide-react";
import { useHeaderTheme } from "../../../hooks/useHeaderTheme";
import {
  DEFAULT_HEADER_THEME_KEY,
  HEADER_THEMES,
  getHeaderThemeConfig,
  isMisaelCumapaUser,
} from "../../../shared/utils/headerThemes";

const THEME_OPTIONS = Object.values(HEADER_THEMES);

/**
 * Selector compacto en 1 clic con paleta visual (Portal) para asignar un color
 * independiente dentro de cada fila o panel de usuario.
 */
function UserThemePickerMenu({
  userName,
  assignedThemeKey,
  isOwner,
  isDisabled,
  onSelectTheme,
}) {
  const assignedConfig = getHeaderThemeConfig(assignedThemeKey);
  const isCustom = assignedThemeKey !== DEFAULT_HEADER_THEME_KEY;

  return (
    <Menu placement="bottom-end" isLazy>
      <MenuButton
        as={Button}
        size="sm"
        variant="outline"
        isDisabled={isDisabled}
        borderRadius="xl"
        px={2.5}
        h="34px"
        bg={isCustom || isOwner ? "white" : "gray.50"}
        borderColor={isCustom ? assignedConfig.hex : "gray.300"}
        borderWidth={isCustom ? "1.5px" : "1px"}
        _hover={{
          borderColor: assignedConfig.hex,
          bg: "white",
        }}
        _active={{ transform: "scale(0.98)" }}
        rightIcon={<ChevronDown size={14} color="#6b7280" />}
      >
        <HStack spacing={2} minW={0}>
          <Box
            w="14px"
            h="14px"
            borderRadius="full"
            bg={assignedConfig.baseBg}
            bgImage={assignedConfig.mainBg}
            border="1px solid rgba(0,0,0,0.22)"
            flexShrink={0}
          />
          <Text
            fontSize="11.5px"
            fontWeight="800"
            color="gray.800"
            maxW={{ base: "95px", sm: "135px" }}
            noOfLines={1}
          >
            {assignedConfig.label}
          </Text>
        </HStack>
      </MenuButton>

      <Portal>
        <MenuList
          zIndex={2200}
          p={2.5}
          borderRadius="2xl"
          boxShadow="2xl"
          border="1px solid"
          borderColor="gray.200"
          minW={{ base: "270px", sm: "320px" }}
          maxW="340px"
          bg="white"
        >
          <Flex
            justify="space-between"
            align="center"
            px={1}
            pb={2}
            mb={2}
            borderBottom="1px solid"
            borderColor="gray.100"
          >
            <Text fontSize="11px" fontWeight="900" color="gray.700" noOfLines={1}>
              {isOwner ? `Tu color (${userName})` : `Color para ${userName}`}
            </Text>
            <Badge
              colorScheme={isCustom ? "purple" : "gray"}
              fontSize="9px"
              borderRadius="full"
              px={2}
            >
              {isCustom ? "Personalizado" : "Default"}
            </Badge>
          </Flex>

          <SimpleGrid columns={2} spacing={1.5}>
            {THEME_OPTIONS.map((item) => {
              const isSelected = assignedThemeKey === item.key;
              return (
                <Box
                  key={item.key}
                  as="button"
                  type="button"
                  onClick={() => onSelectTheme(item.key)}
                  textAlign="left"
                  px={2}
                  py={1.5}
                  borderRadius="xl"
                  border="1.5px solid"
                  borderColor={isSelected ? item.hex : "gray.200"}
                  bg={isSelected ? "gray.50" : "white"}
                  transition="all 0.12s ease"
                  _hover={{
                    borderColor: item.hex,
                    bg: "gray.50",
                  }}
                >
                  <HStack spacing={2} align="center">
                    <Flex
                      w="20px"
                      h="20px"
                      borderRadius="md"
                      bg={item.baseBg}
                      bgImage={item.mainBg}
                      border="1px solid rgba(0,0,0,0.18)"
                      align="center"
                      justify="center"
                      flexShrink={0}
                    >
                      {isSelected && (
                        <Check size={12} color="#ffffff" strokeWidth={3.5} />
                      )}
                    </Flex>
                    <Text
                      fontSize="11px"
                      fontWeight={isSelected ? "900" : "700"}
                      color="gray.800"
                      noOfLines={1}
                    >
                      {item.label}
                    </Text>
                  </HStack>
                </Box>
              );
            })}
          </SimpleGrid>
        </MenuList>
      </Portal>
    </Menu>
  );
}

/**
 * Componente reutilizable (DRY) para asignar un tema de cabeceras independiente
 * por usuario dentro de cada fila o en su panel de edición.
 */
export function UserThemeAccessCard({
  user,
  variant = "panel",
  isTogglingExternal = false,
  isDisabled = false,
  onToggleStart,
  onToggleEnd,
}) {
  const toast = useToast();
  const {
    canManageTheme,
    configuredThemeKey,
    allowedUserIds,
    userThemes,
    updateTheme,
    setUserAccess,
    isError: isThemeError,
  } = useHeaderTheme();
  const [isLocalToggling, setIsLocalToggling] = useState(false);

  if (!canManageTheme || !user) {
    return null;
  }

  const isOwner = isMisaelCumapaUser(user);
  const explicitThemeKey = userThemes?.[String(user.id)];
  const isLegacyAllowed =
    !explicitThemeKey &&
    allowedUserIds.some((id) => String(id) === String(user.id));

  const assignedThemeKey = isOwner
    ? configuredThemeKey
    : explicitThemeKey ||
      (isLegacyAllowed ? configuredThemeKey : DEFAULT_HEADER_THEME_KEY);

  const assignedConfig = getHeaderThemeConfig(assignedThemeKey);
  const isCustomized = assignedThemeKey !== DEFAULT_HEADER_THEME_KEY;
  const isRowToggling = isLocalToggling || isTogglingExternal;

  const handleSelectTheme = async (nextThemeKey) => {
    if (!user?.id || isRowToggling || isThemeError || isDisabled) return;
    if (nextThemeKey === assignedThemeKey) return;

    const targetConfig = getHeaderThemeConfig(nextThemeKey);
    const isResetting = nextThemeKey === DEFAULT_HEADER_THEME_KEY;

    setIsLocalToggling(true);
    onToggleStart?.(user.id);
    try {
      if (isOwner) {
        await updateTheme({ themeKey: nextThemeKey });
      } else {
        await setUserAccess({ userId: user.id, themeKey: nextThemeKey });
      }

      toast({
        title: isResetting
          ? "Restablecido a Verde Original"
          : `Color "${targetConfig.label}" asignado`,
        description: isOwner
          ? `Tu cabecera ahora usa "${targetConfig.label}". Los demás usuarios conservan su propio color.`
          : `${user.username} verá "${targetConfig.label}" en tiempo real.`,
        status: "success",
        duration: 2400,
        isClosable: true,
        position: "top-right",
      });
    } catch (error) {
      toast({
        title: "Error al asignar color",
        description:
          error?.response?.data?.message ||
          error?.message ||
          "No se pudo guardar el color de cabecera para este usuario.",
        status: "error",
        duration: 4000,
        isClosable: true,
        position: "top-right",
      });
    } finally {
      setIsLocalToggling(false);
      onToggleEnd?.(user.id);
    }
  };

  if (variant === "row") {
    return (
      <Flex
        align="center"
        justify="space-between"
        gap={2.5}
        px={3}
        py={2.5}
        borderRadius="xl"
        border="1.5px solid"
        borderColor={isOwner || isCustomized ? assignedConfig.hex : "gray.200"}
        bg={isOwner || isCustomized ? assignedConfig.accentLightBg || "gray.50" : "white"}
        transition="all 0.15s ease"
      >
        <HStack spacing={3} minW={0} flex="1">
          <Avatar
            size="sm"
            name={user.username}
            bg={isOwner || isCustomized ? assignedConfig.hex : "gray.400"}
            color="white"
            fontWeight="800"
          />
          <Box minW={0}>
            <HStack spacing={1.5} align="center" flexWrap="wrap">
              <Text
                fontSize="13px"
                fontWeight="800"
                color="gray.900"
                noOfLines={1}
              >
                {user.username}
              </Text>
              {isOwner && (
                <Badge
                  colorScheme="purple"
                  fontSize="9px"
                  borderRadius="full"
                  px={2}
                  display="inline-flex"
                  alignItems="center"
                  gap={1}
                >
                  <ShieldCheck size={10} />
                  Propietario
                </Badge>
              )}
            </HStack>
            <Text fontSize="11px" color="gray.500" noOfLines={1}>
              {user.email || "Sin correo"}
              {user.role ? ` • ${user.role}` : ""}
            </Text>
          </Box>
        </HStack>

        <HStack spacing={1.5} flexShrink={0}>
          {isRowToggling && <Spinner size="xs" color={assignedConfig.hex} />}
          <UserThemePickerMenu
            userName={user.username}
            assignedThemeKey={assignedThemeKey}
            isOwner={isOwner}
            isDisabled={isRowToggling || isDisabled || isThemeError}
            onSelectTheme={handleSelectTheme}
          />
          {!isOwner && isCustomized && (
            <Tooltip label="Volver a Verde Original" hasArrow>
              <IconButton
                size="sm"
                h="34px"
                w="30px"
                minW="30px"
                variant="ghost"
                colorScheme="gray"
                borderRadius="xl"
                icon={<RotateCcw size={13} />}
                aria-label={`Restablecer color de ${user.username} a Verde Original`}
                isDisabled={isRowToggling || isDisabled || isThemeError}
                onClick={() => handleSelectTheme(DEFAULT_HEADER_THEME_KEY)}
              />
            </Tooltip>
          )}
        </HStack>
      </Flex>
    );
  }

  return (
    <Box
      bg="gray.50"
      p={4}
      borderRadius="xl"
      border="1px solid"
      borderColor="gray.200"
    >
      <Flex
        justify="space-between"
        align={{ base: "start", sm: "center" }}
        direction={{ base: "column", sm: "row" }}
        gap={3}
      >
        <Box flex="1">
          <HStack spacing={2} mb={1} flexWrap="wrap">
            <Text
              fontSize="xs"
              fontWeight="900"
              color="gray.800"
              textTransform="uppercase"
              letterSpacing="wider"
            >
              🎨 Color de Cabecera Individual
            </Text>
            <Badge
              colorScheme="green"
              fontSize="9px"
              borderRadius="full"
              px={2}
            >
              Solo Misael
            </Badge>
          </HStack>
          <Text fontSize="xs" color="gray.600">
            Asigna un tema visual exclusivo para este usuario sin afectar el color de otros usuarios.
          </Text>
        </Box>
        <HStack spacing={2} flexShrink={0}>
          {isRowToggling && <Spinner size="xs" color={assignedConfig.hex} />}
          <UserThemePickerMenu
            userName={user.username}
            assignedThemeKey={assignedThemeKey}
            isOwner={isOwner}
            isDisabled={isRowToggling || isDisabled || isThemeError}
            onSelectTheme={handleSelectTheme}
          />
        </HStack>
      </Flex>
    </Box>
  );
}

export default UserThemeAccessCard;
