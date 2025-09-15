import { HStack, Button, Icon } from "@chakra-ui/react";
import { 
  MdOutlineTrackChanges, 
  MdOutlineAttachMoney, 
  MdOutlinePriceCheck 
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import styles from "./QuickActions.module.css"; 

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { label: "Lista de Precios", icon: MdOutlinePriceCheck, path: "/productsPriceList" },
    { label: "Mis Pedidos", icon: MdOutlineTrackChanges, path: "/reports" },
    { label: "Cuentas por Cobrar", icon: MdOutlineAttachMoney, path: "/receivable" },
  ]; 

  return (
    <HStack spacing={2} className={styles.btnsgroup}>
      {actions.map((action) => (
        <Button
          key={action.path}
          leftIcon={<Icon as={action.icon} />}
          bg="whiteAlpha.300"
          color="white"
          size="md"
          borderRadius="full"
          _hover={{ bg: "whiteAlpha.400" }}
          className={styles.btnactionsdash}
          onClick={() => navigate(action.path)}
        >
          {action.label}
        </Button>
      ))}
    </HStack>
  );
}
