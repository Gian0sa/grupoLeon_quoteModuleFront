import { useQuery } from "@tanstack/react-query";
import { profileUser, sellersData , services } from "../../services/auhtService";

export function useSellersData() {
  return useQuery({
    queryKey: ["sellersData"],
    queryFn: sellersData,
    staleTime: 1000 * 60 * 15, // 15 min
    cacheTime: 1000 * 60 * 60, // 1 hora
    refetchOnWindowFocus: false,
    retry: 2,
    onError: (error) => {
      console.error("Error al obtener los datos de los vendedores:", error);
    },
  });
}

export function useGetServices(){
   return useQuery({
    queryKey: ["Services"],
    queryFn: services,
    onSuccess: (data) => {
    },
    onError: (error) => {
      console.error("Error al obtener los servicios:", error);
    },
  });
}


export function useGetProfileData(){
   return useQuery({
    queryKey: ["profileUser"],
    queryFn: profileUser,
    onSuccess: (data) => {
    },
    onError: (error) => {
      console.error("Error al obtener el perfil del usuario:", error);
    },
  });
}