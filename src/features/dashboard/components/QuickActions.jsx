import { HStack, Button, Icon } from "@chakra-ui/react";
import { MdBarChart, MdBubbleChart } from "react-icons/md";
import { useNavigate } from "react-router-dom";
import styles from "./QuickActions.module.css"; 

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: "Seguimiento de Pedidos", icon: MdBarChart, path: "/reports" },
    { label: "Cuentas por Cobrar", icon: MdBubbleChart, path: "/receivable" },
  ]; 
  return (
    <HStack spacing={3} className={styles.btnsgroup}>
      {actions.map((action) => (
        <Button
          key={action.path}
          leftIcon={<Icon as={action.icon} />}
          bg="whiteAlpha.200"
          color="white"
          size="md"
          borderRadius="full"
          _hover={{ bg: "whiteAlpha.300" }}
          className={styles.btnactionsdash}
          onClick={() => navigate(action.path)}
        >
          {action.label}
        </Button>
      ))}
    </HStack>
  );
}
