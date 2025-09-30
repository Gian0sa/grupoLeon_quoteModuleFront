import React from "react";
import { HStack, Button } from "@chakra-ui/react";
import { CheckIcon, CloseIcon } from "@chakra-ui/icons";

export default function ActionButtons({ onSubmit, onReset }) {
  return (
    <HStack justify="flex-end" spacing={4}>
      <Button leftIcon={<CheckIcon />} colorScheme="green" onClick={onSubmit}>
        Guardar
      </Button>
      <Button leftIcon={<CloseIcon />} colorScheme="red" variant="outline" onClick={onReset}>
        Limpiar
      </Button>
    </HStack>
  );
}
