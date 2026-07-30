import { useQuery } from "@tanstack/react-query";
import {
  getProducts,
  getFilterMetadata,
  getProductEquivalents,
  getProductApplications,
  getTraceEquivalence
} from "../../services/catalogServices";

export const useProducts = (page, limit, filters) => {
  return useQuery({
    queryKey: ["products", page, limit, filters],
    queryFn: () => getProducts(page, limit, filters),
  });
};

export const useFilterMetadata = () => {
  return useQuery({
    queryKey: ["filterMetadata"],
    queryFn: getFilterMetadata,
  });
};

export const useProductEquivalents = (slug, page, limit, tipoId, documentoOrigenId, searchCode, mode = 'deep') => {
  return useQuery({
    queryKey: ["productEquivalents", slug, page, limit, tipoId, documentoOrigenId, searchCode, mode],
    queryFn: () => getProductEquivalents(slug, page, limit, tipoId, documentoOrigenId, searchCode, mode),
    enabled: !!slug,
  });
};

export const useProductApplications = (slug, page, limit) => {
  return useQuery({
    queryKey: ["productApplications", slug, page, limit],
    queryFn: () => getProductApplications(slug, page, limit),
    enabled: !!slug,
  });
};

export const useTraceEquivalence = (slugA, slugB) => {
  return useQuery({
    queryKey: ["traceEquivalence", slugA, slugB],
    queryFn: () => getTraceEquivalence(slugA, slugB),
    enabled: !!slugA && !!slugB,
  });
};

// Stub for legacy form page
export const useProductById = () => {
  return useQuery({
    queryKey: ["productByIdStub"],
    queryFn: () => Promise.reject(new Error("Endpoint getById eliminado")),
    enabled: false
  });
};
