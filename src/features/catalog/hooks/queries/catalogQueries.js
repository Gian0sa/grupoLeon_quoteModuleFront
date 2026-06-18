import { useQuery } from "@tanstack/react-query";
import {
  getProducts,
  getFilterMetadata,
  getProductEquivalents,
  getProductApplications
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

export const useProductEquivalents = (slug, page, limit, tipoId, documentoOrigenId, searchCode) => {
  return useQuery({
    queryKey: ["productEquivalents", slug, page, limit, tipoId, documentoOrigenId, searchCode],
    queryFn: () => getProductEquivalents(slug, page, limit, tipoId, documentoOrigenId, searchCode),
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

// Stub for legacy form page
export const useProductById = () => {
  return useQuery({
    queryKey: ["productByIdStub"],
    queryFn: () => Promise.reject(new Error("Endpoint getById eliminado")),
    enabled: false
  });
};
