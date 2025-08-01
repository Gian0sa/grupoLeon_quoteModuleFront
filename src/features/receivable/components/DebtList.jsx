import { VStack } from "@chakra-ui/react";
import { DebtCard } from "./DebtCard";

export function DebtList({ debts, onViewInvoices, onViewDetails }) {
  return (
    <VStack spacing={4} align="stretch">
      {debts.map((debt) => (
        <DebtCard
          key={debt.id}
          debt={debt}
          onViewInvoices={onViewInvoices}
          onViewDetails={onViewDetails}
        />
      ))}
    </VStack>
  );
}