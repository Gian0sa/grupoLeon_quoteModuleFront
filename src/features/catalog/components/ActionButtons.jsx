import { HStack, Button } from "@chakra-ui/react";

export default function ActionButtons({ onSubmit, onReset, isLoading, label, isDisabled }) {
  return (
    <HStack justify="flex-end" spacing={4}>
      <Button
        variant="outline"
        onClick={onReset}
        isDisabled={isDisabled || isLoading}
      >
        Limpiar
      </Button>
      <Button
        colorScheme="blue"
        onClick={onSubmit}
        isLoading={isLoading}
        isDisabled={isDisabled || isLoading}
      >
        {label}
      </Button>
    </HStack>
  );
}
