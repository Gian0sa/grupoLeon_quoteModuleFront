/**
 * Utilidades para empaquetado, compresión y decodificación URL-safe del Estado de Cuenta
 * Permite compartir un enlace único que el cliente puede abrir directamente en su navegador
 * sin requerir autenticación previa.
 */

// Codificación Base64 segura para URLs compatible con UTF-8
export const encodeStatementToken = (data) => {
  try {
    const jsonStr = JSON.stringify(data);
    // Codificar UTF-8 a Base64 URL-safe
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    return encoded;
  } catch (error) {
    console.error("Error al codificar token de estado de cuenta:", error);
    return null;
  }
};

// Decodificación Base64 URL-safe compatible con UTF-8
export const decodeStatementToken = (token) => {
  try {
    if (!token) return null;
    let base64 = token.replace(/-/g, "+").replace(/_/g, "/");
    // Rellenar padding de Base64 si falta
    while (base64.length % 4) {
      base64 += "=";
    }
    const jsonStr = decodeURIComponent(escape(atob(base64)));
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("Error al decodificar token de estado de cuenta:", error);
    return null;
  }
};

// Cálculo de días de vencimiento (VD)
export const calculateVD = (venceDateStr) => {
  if (!venceDateStr) return { days: 0, label: "—", status: "NORMAL" };
  
  let d;
  if (typeof venceDateStr === "string" && venceDateStr.includes("-") && venceDateStr.split("-")[0].length <= 2) {
    const [day, month, year] = venceDateStr.split("-");
    d = new Date(year, month - 1, day);
  } else if (typeof venceDateStr === "string" && venceDateStr.includes("/") && venceDateStr.split("/")[0].length <= 2) {
    const [day, month, year] = venceDateStr.split("/");
    d = new Date(year, month - 1, day);
  } else if (typeof venceDateStr === "string" && venceDateStr.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [year, month, day] = venceDateStr.split("T")[0].split("-");
    d = new Date(year, month - 1, day);
  } else {
    d = new Date(venceDateStr);
  }

  if (isNaN(d.getTime())) return { days: 0, label: "—", status: "NORMAL" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - d.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0) {
    return {
      days: diffDays,
      label: `VD +${diffDays}d`,
      fullLabel: `Vencido hace ${diffDays} días`,
      status: "VENCIDO"
    };
  } else if (diffDays === 0) {
    return {
      days: 0,
      label: "VENCE HOY",
      fullLabel: "Vence hoy",
      status: "HOY"
    };
  } else {
    return {
      days: Math.abs(diffDays),
      label: `${Math.abs(diffDays)}d`,
      fullLabel: `Vence en ${Math.abs(diffDays)} días`,
      status: "POR_VENCER"
    };
  }
};

import { axiosInstance } from "../../../shared/lib/axiosInstance";

// Estructurar payload estándar de Estado de Cuenta
export const buildStatementPayload = (debtData) => {
  if (!debtData) return null;

  const rawDocs = debtData.documents || debtData.documentos || [];
  const clientName = debtData.nombre || debtData.clientName || rawDocs[0]?.CARDNAME || "CLIENTE";
  const rawCode = debtData.clientCode || debtData.ruc || rawDocs[0]?.CARDCODE || "";
  const clientCode = rawCode ? `CL${rawCode.replace(/^CL/i, "")}` : "";
  const salesperson = debtData.vendedor || rawDocs[0]?.NOMBVENDEDOR || "Asesor Comercial";

  const simplifiedDocs = rawDocs.map((d) => {
    const vdInfo = calculateVD(d.REFDATE || d.fechaContable || d.fechaVencimiento);
    const numDocUpper = (d.numeroDocumento || d.NRO_DOC || "").toUpperCase();
    const isLetra = Boolean(
      d.esLetra ||
      (d.tipoDocumento || "").toLowerCase().includes("letra") ||
      numDocUpper.startsWith("LC-") ||
      numDocUpper.startsWith("LT-")
    );
    
    // Identificar si la letra está en Cartera (Vía Directa = VD) o en el Banco
    const idUnico = (d.idUnico || d.ID_UNICO || d.letraSAP || "").trim();
    const ubicacion = (d.ubicacion || d.UBICACION || d.ESTADO || "").toUpperCase();
    const condicion = (d.condicionPago || d.CONDICION || "").toUpperCase();
    
    const enBanco = isLetra && Boolean(
      (idUnico && idUnico.length >= 6) ||
      ubicacion.includes("BANCO") ||
      ubicacion.includes("COBRANZA") ||
      condicion.includes("BANCO")
    );

    const isVD = isLetra && !enBanco && (
      ubicacion.includes("VD") ||
      ubicacion.includes("CARTERA") ||
      condicion.includes("VD") ||
      condicion.includes("CARTERA") ||
      !idUnico ||
      d.VD === "VD" ||
      d.isVD
    );

    return {
      num: d.numeroDocumento || d.NRO_DOC || "",
      ref: d.facturaOrigen || (Array.isArray(d.referencia) ? d.referencia[0] : "") || "",
      fol: d.folioNum || d.FOLIONUM || d.docEntry || d.DOCENTRY || "",
      emi: d.TAXDATE || d.fechaImpuesto || d.FECHA_DOC || d.fechaDocumento || "",
      ven: d.REFDATE || d.fechaContable || d.fechaVencimiento || "",
      con: d.condicionPago || d.CONDICION || "—",
      uni: idUnico,
      mon: (d.moneda || d.TIPOCAMBIO || "USD").toUpperCase(),
      tot: Number(d.totalDocumento || d.TOTAL_DOC || 0),
      sPen: (d.moneda || d.TIPOCAMBIO || "USD").toUpperCase().includes("PEN") || (d.moneda || d.TIPOCAMBIO || "USD").toUpperCase().includes("SOL") || (d.moneda || d.TIPOCAMBIO || "USD").toUpperCase().includes("S/")
        ? Number(d.saldoPendiente?.PEN ?? d.SALDO_PEN ?? d.sPen ?? d.totalDocumento ?? d.TOTAL_DOC ?? 0)
        : 0,
      sUsd: !(d.moneda || d.TIPOCAMBIO || "USD").toUpperCase().includes("PEN") && !(d.moneda || d.TIPOCAMBIO || "USD").toUpperCase().includes("SOL") && !(d.moneda || d.TIPOCAMBIO || "USD").toUpperCase().includes("S/")
        ? Number(d.saldoPendiente?.USD ?? d.SALDO_USD ?? d.sUsd ?? d.totalDocumento ?? d.TOTAL_DOC ?? 0)
        : 0,
      vd: vdInfo.days,
      vdStatus: (Number(d.saldoPendiente?.PEN ?? d.SALDO_PEN ?? d.sPen ?? d.totalDocumento ?? 0) < 0 || Number(d.saldoPendiente?.USD ?? d.SALDO_USD ?? d.sUsd ?? d.totalDocumento ?? 0) < 0 || numDocUpper.startsWith("NC-") || numDocUpper.startsWith("ABO-") || numDocUpper.includes("07F") || (d.tipoDocumento || "").toLowerCase().includes("credito") || (d.tipoDocumento || "").toLowerCase().includes("abono"))
        ? "POR_VENCER"
        : vdInfo.status,
      isVD: Boolean(isVD),
      esLetra: Boolean(isLetra),
      enBanco: Boolean(enBanco),
    };
  });

  return {
    cName: clientName,
    cCode: clientCode,
    sales: salesperson,
    docs: simplifiedDocs,
    createdAt: new Date().toISOString(),
    phone: debtData.telefono || debtData.cellular || debtData.Cellular || debtData.Phone1 || "",
    email: debtData.email || debtData.E_Mail || "",
  };
};

// Generar código corto único local
export const generateShortCode = (debtData) => {
  const rawCode = debtData?.clientCode || debtData?.ruc || debtData?.documents?.[0]?.CARDCODE || "0000";
  const clean = String(rawCode).replace(/\D/g, "") || "0000";
  const suffix = clean.slice(-4) || "0000";
  const randomPart = Math.random().toString(36).substring(2, 6);
  return `s-${suffix}-${randomPart}`;
};

// Almacenar localmente en localStorage (para fallback instantáneo y offline)
export const saveLocalStatement = (code, payload) => {
  try {
    if (!code || !payload) return;
    const key = `statement_share_${code}`;
    localStorage.setItem(key, JSON.stringify({ ...payload, code }));

    const indexKey = "statement_share_index";
    const existing = JSON.parse(localStorage.getItem(indexKey) || "[]");
    if (!existing.includes(code)) {
      existing.unshift(code);
      if (existing.length > 50) existing.pop();
      localStorage.setItem(indexKey, JSON.stringify(existing));
    }
  } catch (err) {
    console.warn("No se pudo guardar estado de cuenta en localStorage:", err);
  }
};

// Obtener estado de cuenta de localStorage
export const getLocalStatement = (code) => {
  try {
    if (!code) return null;
    const key = `statement_share_${code}`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/**
 * Genera un enlace corto público (ej. http://dominio/s/s-6415-a8f2)
 * Nunca genera enlaces largos; si no hay internet, guarda el snapshot localmente
 */
export const createShortStatementUrl = async (debtData) => {
  const payload = buildStatementPayload(debtData);
  if (!payload) return "";

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const code = generateShortCode(debtData);
  saveLocalStatement(code, payload);

  try {
    const response = await axiosInstance.post("/reportModule/statement/share", {
      ...payload,
      code,
    });
    if (response.data?.code) {
      saveLocalStatement(response.data.code, payload);
      return `${baseUrl}/s/${response.data.code}`;
    }
  } catch (error) {
    // Si no hay conexión o falla el backend, se mantiene el enlace corto localmente
    console.warn("Backend offline, preservando enlace corto en almacenamiento local:", error?.message);
  }

  return `${baseUrl}/s/${code}`;
};

/**
 * Consulta un estado de cuenta compartido públicamente por su código corto
 */
export const fetchPublicStatementByCode = async (code) => {
  if (!code) return null;
  
  // 1. Intentar desde el backend
  try {
    const response = await axiosInstance.get(`/reportModule/statement/share/${code}`);
    if (response.data) {
      saveLocalStatement(code, response.data);
      return response.data;
    }
  } catch (error) {
    console.warn("No se pudo consultar al backend, verificando almacenamiento local:", error?.message);
  }

  // 2. Fallback a almacenamiento local si no hay internet
  return getLocalStatement(code);
};

// Generar URL pública corta síncrona inmediata (Siempre corta)
export const generateStatementUrl = (debtData) => {
  const payload = buildStatementPayload(debtData);
  if (!payload) return "";

  const code = generateShortCode(debtData);
  saveLocalStatement(code, payload);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  return `${baseUrl}/s/${code}`;
};
