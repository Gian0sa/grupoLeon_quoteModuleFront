/**
 * Helper dinámico para estructurar los servicios y permisos en un árbol jerárquico visual
 * respetando 100% las categorías y endpoints de la base de datos sin omitir ninguna opción.
 */

/**
 * Organiza la lista completa de servicios recibidos del backend en categorías dinámicas 100% fieles a la BD
 */
export function buildPermissionTree(services = []) {
  if (!Array.isArray(services) || services.length === 0) return [];

  const categoriesMap = new Map();

  services.forEach((service) => {
    let rawCategory = "Otros";
    let displayName = service.name || "Servicio";

    if (service.name && service.name.includes(" - ")) {
      const parts = service.name.split(" - ");
      rawCategory = parts[0].trim();
      displayName = parts.slice(1).join(" - ").trim();
    } else if (service.name && service.name.includes("-")) {
      const parts = service.name.split("-");
      rawCategory = parts[0].trim();
      displayName = parts.slice(1).join("-").trim();
    } else if (service.name) {
      rawCategory = service.name.trim();
      displayName = service.name.trim();
    } else if (service.path) {
      rawCategory = service.path.split("/")[1] || "API";
      displayName = `${service.method || "GET"} ${service.path}`;
    }

    const catKey = rawCategory.toLowerCase();

    if (!categoriesMap.has(catKey)) {
      const cleanCode = rawCategory
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "") || "modulo";

      categoriesMap.set(catKey, {
        key: catKey,
        name: rawCategory,
        code: cleanCode,
        services: []
      });
    }

    categoriesMap.get(catKey).services.push({
      ...service,
      displayName: displayName || service.name,
      endpointCode: service.method ? `${service.method} ${service.path || ""}` : (service.path || service.name)
    });
  });

  return Array.from(categoriesMap.values());
}

/**
 * Determina el estado de selección de un conjunto de servicios
 * @returns {"all" | "partial" | "none"}
 */
export function getSelectionState(serviceList, permittedServices = []) {
  if (!serviceList || serviceList.length === 0) return "none";
  const permSet = new Set((permittedServices || []).map((id) => Number(id)));
  const selectedCount = serviceList.filter((s) => permSet.has(Number(s.id))).length;

  if (selectedCount === 0) return "none";
  if (selectedCount === serviceList.length) return "all";
  return "partial";
}
