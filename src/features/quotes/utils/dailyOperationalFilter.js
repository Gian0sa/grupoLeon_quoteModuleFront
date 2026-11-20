const PENDING_STATES = new Set([
  "PENDIENTE",
  "PENDIENTE_APROBACION",
  "ENVIADO",
  "EN_PROCESO",
  "PENDIENTE_FACTURACION",
  "EN_FACTURACION",
  "PENDIENTE_GERENCIA",
  "OBSERVADO",
  "EN_EDICION",
]);

const DRAFT_STATES = new Set(["BORRADOR", "DRAFT", "GENERADO"]);
const INVOICED_STATES = new Set(["FACTURADO", "COMPLETADO"]);
const EMITTED_STATES = new Set([
  "EMITIDO",
  "EMITIDO_SAP",
  "PEDIDO_EMITIDO",
  "ORDEN_EMITIDA",
  "APROBADO",
  "APROBADO_COMERCIAL",
  "APROBADO_CREDITOS",
]);

function safeParseTotals(raw) {
  if (!raw) return {};
  if (typeof raw === "object") return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function safeParseHistory(raw) {
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * Obtiene la fecha actual en la zona horaria oficial del negocio (Perú: America/Lima, UTC-5)
 * en formato YYYY-MM-DD.
 */
export const getTodayPeruDateString = () => {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  } catch {
    return new Date().toISOString().split("T")[0];
  }
};

export const toPeruDateString = (rawDate) => {
  if (!rawDate) return "";
  const str = String(rawDate).trim();
  if (!str) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  try {
    const d = new Date(str);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
    }
  } catch {}
  return str.split("T")[0] || "";
};

/**
 * Obtiene la fecha representativa de una cotización en formato YYYY-MM-DD
 * respetando la zona horaria de Perú si viene como ISO timestamp.
 */
export const getQuoteDateString = (q) => {
  if (!q) return "";
  return toPeruDateString(q.docDate || q.DocDate || q.createdAt || "");
};

function findHistoryDate(q, statuses, noteKeywords = []) {
  const totalsObj = safeParseTotals(q?.totals);
  const historyList = safeParseHistory(q?.history ?? q?.historyLog ?? totalsObj?.historyLog);
  for (let i = historyList.length - 1; i >= 0; i--) {
    const h = historyList[i];
    if (!h || typeof h !== "object") continue;
    const hStatus = String(h.status || h.state || "").toUpperCase().trim();
    const hNote = String(h.note || h.comment || "").toUpperCase();
    if (statuses.includes(hStatus) || noteKeywords.some((kw) => hNote.includes(kw))) {
      const resolved = toPeruDateString(h.timestamp || h.date || h.createdAt);
      if (resolved) return resolved;
    }
  }
  return "";
}

/**
 * Obtiene la fecha en que una cotización fue aprobada o emitida a SAP en formato YYYY-MM-DD (hora Perú).
 */
export const getQuoteApprovalOrUpdatedDateString = (q) => {
  if (!q) return "";
  const totalsObj = safeParseTotals(q.totals);
  const rawApproval =
    q.approvedAt ||
    q.emittedAt ||
    q.sapEmittedAt ||
    q.sapSyncDate ||
    totalsObj?.emittedAt ||
    totalsObj?.approvedAt;
  if (rawApproval) {
    const resolved = toPeruDateString(rawApproval);
    if (resolved) return resolved;
  }

  const fromHistory = findHistoryDate(
    q,
    ["EMITIDO", "EMITIDO_SAP", "APROBADO", "APROBADO_COMERCIAL", "APROBADO_CREDITOS", "PEDIDO_EMITIDO"],
    ["APROBADA", "EMITIDA", "ORDEN DE VENTA"]
  );
  if (fromHistory) return fromHistory;

  return getQuoteDateString(q);
};

export const getQuoteInvoicedDateString = (q) => {
  if (!q) return "";
  const totalsObj = safeParseTotals(q.totals);
  const rawInvoiced =
    q.invoicedAt ||
    q.sapClosedAt ||
    totalsObj?.invoicedAt ||
    totalsObj?.sapClosedAt;
  if (rawInvoiced) {
    const resolved = toPeruDateString(rawInvoiced);
    if (resolved) return resolved;
  }

  const fromHistory = findHistoryDate(
    q,
    ["FACTURADO", "COMPLETADO"],
    ["FACTURADA", "CERRADA EN SAP"]
  );
  if (fromHistory) return fromHistory;

  return getQuoteApprovalOrUpdatedDateString(q);
};

export const getQuoteCancelledDateString = (q) => {
  if (!q) return "";
  const totalsObj = safeParseTotals(q.totals);
  const rawCancelled = q.cancelledAt || totalsObj?.cancelledAt;
  if (rawCancelled) {
    const resolved = toPeruDateString(rawCancelled);
    if (resolved) return resolved;
  }

  const fromHistory = findHistoryDate(
    q,
    ["CANCELADO", "ANULADO", "RECHAZADO"],
    ["CANCELADA", "ANULADA", "RECHAZADA"]
  );
  if (fromHistory) return fromHistory;

  return getQuoteDateString(q);
};

function hasSapEmission(q) {
  if (!q) return false;
  const totalsObj = safeParseTotals(q.totals);
  const rawSap =
    q.sapDocNum ||
    totalsObj?.sapDocNum ||
    (q.DocNum && !String(q.DocNum).startsWith("COT-") ? q.DocNum : null) ||
    (totalsObj?.DocNum && !String(totalsObj.DocNum).startsWith("COT-") ? totalsObj.DocNum : null);
  return Boolean(
    (rawSap && !Number.isNaN(Number(rawSap)) && Number(rawSap) > 0) ||
      q.isSapDirect ||
      totalsObj?.isSapDirect
  );
}

function isCancelledStatus(status) {
  if (!status) return false;
  const s = String(status).toUpperCase().trim();
  return (
    s === "ANULADO" ||
    s === "CANCELADO" ||
    s === "RECHAZADO" ||
    s.includes("ANULADO") ||
    s.includes("CANCELADO") ||
    s.includes("RECHAZADO")
  );
}

/**
 * Determina si una cotización cumple la regla operativa de visualización diaria:
 * 1. Pendientes de aprobación: SIEMPRE se muestran hasta ser aprobadas o anuladas.
 * 2. Borradores: SIEMPRE elegibles según sus permisos de propiedad.
 * 3. Facturadas / Completadas en SAP: se muestran durante todo el día calendario (Perú) en que se facturaron; al día siguiente se ocultan.
 * 4. Emitidas / Aprobadas / Anuladas: se muestran durante todo el día calendario de su emisión/anulación; al día siguiente pasan al Histórico.
 */
export const isQuoteOperationalDaily = (q, todayDateStr) => {
  if (!q) return false;
  const today = todayDateStr || getTodayPeruDateString();
  const totalsObj = safeParseTotals(q.totals);
  const status = String(q.approvalStatus || q.state || q.status || "GENERADO")
    .toUpperCase()
    .trim();
  const hasSap = hasSapEmission(q);

  if (isCancelledStatus(status) || q.isCancelled || totalsObj?.isCancelled) {
    return getQuoteCancelledDateString(q) === today || getQuoteDateString(q) === today;
  }

  if (INVOICED_STATES.has(status)) {
    const invoicedDate = getQuoteInvoicedDateString(q);
    return invoicedDate ? invoicedDate === today : getQuoteDateString(q) === today;
  }

  if (DRAFT_STATES.has(status) && !hasSap) {
    return true;
  }

  if (PENDING_STATES.has(status) && !hasSap) {
    return true;
  }

  if (EMITTED_STATES.has(status) || hasSap) {
    const approvalDate = getQuoteApprovalOrUpdatedDateString(q);
    if (approvalDate && approvalDate === today) {
      return true;
    }
    return getQuoteDateString(q) === today;
  }

  return true;
};
