import { useAuthStore } from "../../features/auth/stores/useAuthStore";

export function useHasAccess() {
  const endpoints = useAuthStore((state) => state.endpoints);
  console.log(endpoints);
  return (endpoint) => endpoints?.includes(endpoint);
}
