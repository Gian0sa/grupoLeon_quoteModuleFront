import { useQuery } from "@tanstack/react-query";
import { adminUsers } from "../../services/authAdminService";

export function useGetAllUsersAdmin(){
   return useQuery({
    queryKey: ["adminUsers"],
    queryFn: adminUsers,
    onSuccess: (data) => {
    },
    onError: (error) => {
      console.error("Error al obtener los perfiles de usuario:", error);
    },
  });
}

