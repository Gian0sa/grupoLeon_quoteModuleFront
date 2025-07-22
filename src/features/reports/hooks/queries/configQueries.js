import { useQuery } from "@tanstack/react-query";
import { getAllRules, getRuleById } from "../../services/configService";

export const useRules = () => {
  return useQuery({
    queryKey: ["rules"],
    queryFn: getAllRules,
  });
};

export const useRule = (id) => {
  return useQuery({
    queryKey: ["rule", id],
    queryFn: () => getRuleById(id),
    enabled: !!id,
  });
};
