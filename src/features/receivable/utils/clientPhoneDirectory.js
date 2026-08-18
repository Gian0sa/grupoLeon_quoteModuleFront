/**
 * Directorio Persistente de Teléfonos de Clientes
 * Vincula RUC / DNI / CardCode de clientes con sus números de teléfono
 * para precargarlos automáticamente al enviar Estados de Cuenta por WhatsApp.
 */

const STORAGE_KEY = "grupoLeon_client_phones_directory_v1";

// Helper para limpiar códigos de cliente (CL20603318499 -> 20603318499)
export const normalizeClientKey = (clientCodeOrDoc) => {
  if (!clientCodeOrDoc) return "";
  return String(clientCodeOrDoc).trim().toUpperCase().replace(/^CL/i, "");
};

// Obtener el diccionario completo
export const getClientPhoneDirectory = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    console.error("Error al leer directorio de teléfonos:", error);
    return {};
  }
};

// Guardar o actualizar el teléfono de un cliente
export const saveClientPhone = (clientCodeOrDoc, phone, clientName = "") => {
  try {
    const key = normalizeClientKey(clientCodeOrDoc);
    if (!key) return false;

    const cleanPhone = String(phone || "").replace(/\D/g, "");
    if (!cleanPhone) return false;

    const directory = getClientPhoneDirectory();
    directory[key] = {
      phone: cleanPhone,
      clientName: clientName || directory[key]?.clientName || "",
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(directory));
    return true;
  } catch (error) {
    console.error("Error al guardar teléfono en directorio:", error);
    return false;
  }
};

// Buscar teléfono de un cliente en el directorio
export const getClientPhone = (clientCodeOrDoc) => {
  try {
    const key = normalizeClientKey(clientCodeOrDoc);
    if (!key) return null;

    const directory = getClientPhoneDirectory();
    const entry = directory[key];
    return entry ? entry.phone : null;
  } catch {
    return null;
  }
};
