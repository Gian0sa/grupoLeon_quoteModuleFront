import { useQuery } from "@tanstack/react-query";
import { sellersData } from "../../services/auhtService";

export function useSellersData() {
  return useQuery({
    queryKey: ["sellersData"],
    queryFn: sellersData,
    onSuccess: (data) => {
      console.log(data);
    },
    onError: (error) => {
      console.error("Error al obtener los datos de los vendedores:", error);
    },
  });
}