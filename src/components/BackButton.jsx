import { Button } from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";

export function BackButton() {
  const navigate = useNavigate();

  return (
    <Button colorScheme="gray" onClick={() => navigate(-1)}>
      Volver atrás
    </Button>
  );
}