import { Checkbox, HStack, VStack, Text, Badge } from "@chakra-ui/react";
import { getServiceDisplayName } from "../../../shared/utils/serviceHelpers";

export default function ServiceItem({ service, isChecked, onChange, colorScheme }) {
  return (
    <Checkbox
      isChecked={isChecked}
      onChange={onChange}
      colorScheme={colorScheme}
      spacing={3}
    >
      <VStack align="start" spacing={1}>
        <Text fontWeight="medium" fontSize="sm">
          {getServiceDisplayName(service.name)}
        </Text>
        <HStack spacing={2}>
          <Badge colorScheme="gray" size="sm" fontSize="xs">
            {service.method}
          </Badge>
          <Text fontSize="xs" color="gray.500" noOfLines={1}>
            {service.path}
          </Text>
        </HStack>
      </VStack>
    </Checkbox>
  );
}