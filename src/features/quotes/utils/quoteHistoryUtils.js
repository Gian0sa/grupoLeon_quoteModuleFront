const SAP_TAG_REGEX = /\s*\[SAP:\s*([^\]]+)\]\s*$/i;
const VIEW_NOTE_USER_REGEX = /Solicitud abierta y le[íi]da por\s+(.+)$/i;
const NOTE_ACTOR_SUFFIX_REGEX = /\bpor\s+([^()]+?)(?:\s*\(|$)/i;

export function safeParseHistoryLog(raw) {
  if (Array.isArray(raw)) return [...raw];
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function normalizeActorName(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function extractViewerFromNote(note) {
  const match = String(note || "").match(VIEW_NOTE_USER_REGEX);
  return match && match[1] ? match[1].trim() : "";
}

function getEntryTimeMs(entry) {
  const rawTs = entry?.timestamp || entry?.date || entry?.createdAt;
  if (!rawTs) return 0;
  const ms = new Date(rawTs).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function getViewUserKey(entry) {
  const rawUser = entry?.user || entry?.username || entry?.author || extractViewerFromNote(entry?.note);
  const parsed = parseAuditActor(String(rawUser || ""));
  const withoutPrefix = String(parsed.name || rawUser || "").replace(/^\d+\.\s*/, "");
  const norm = normalizeActorName(withoutPrefix);
  return norm || "sistema";
}

/**
 * Elimina entradas VISTO duplicadas del mismo usuario, conservando únicamente
 * la entrada más reciente por usuario y preservando intactos los demás eventos.
 */
export function dedupeViewHistoryLogs(rawLogs) {
  const logs = safeParseHistoryLog(rawLogs);
  if (logs.length === 0) return [];

  const bestIndexByUser = new Map();
  const bestTimeByUser = new Map();

  logs.forEach((entry, idx) => {
    if (!entry || typeof entry !== "object") return;
    if (String(entry.status || "").toUpperCase().trim() !== "VISTO") return;

    const userKey = getViewUserKey(entry);
    const entryMs = getEntryTimeMs(entry);

    if (!bestIndexByUser.has(userKey)) {
      bestIndexByUser.set(userKey, idx);
      bestTimeByUser.set(userKey, entryMs);
    } else {
      const prevMs = bestTimeByUser.get(userKey) || 0;
      if (entryMs > prevMs) {
        bestIndexByUser.set(userKey, idx);
        bestTimeByUser.set(userKey, entryMs);
      }
    }
  });

  return logs.filter((entry, idx) => {
    if (!entry || typeof entry !== "object") return false;
    if (String(entry.status || "").toUpperCase().trim() !== "VISTO") return true;
    const userKey = getViewUserKey(entry);
    return bestIndexByUser.get(userKey) === idx;
  });
}

/**
 * Registra o actualiza (en su lugar) el evento VISTO de un usuario, evitando duplicados
 * y actualizando únicamente su hora de lectura.
 */
export function upsertViewHistoryLog(rawLogs, viewerName, timestampIso) {
  const deduped = dedupeViewHistoryLogs(rawLogs);
  const cleanViewer = String(viewerName || "Usuario").trim() || "Usuario";
  const targetKey = normalizeActorName(cleanViewer);
  const nowIso = timestampIso || new Date().toISOString();

  let foundIdx = -1;
  for (let i = 0; i < deduped.length; i++) {
    const entry = deduped[i];
    if (!entry || typeof entry !== "object") continue;
    if (String(entry.status || "").toUpperCase().trim() !== "VISTO") continue;
    if (getViewUserKey(entry) === targetKey) {
      foundIdx = i;
      break;
    }
  }

  const nextEntry = {
    ...(foundIdx >= 0 ? deduped[foundIdx] : {}),
    status: "VISTO",
    timestamp: nowIso,
    user: cleanViewer,
    note: `👁️ Solicitud abierta y leída por ${cleanViewer}`,
  };

  if (foundIdx >= 0) {
    const updated = [...deduped];
    updated[foundIdx] = nextEntry;
    return updated;
  }

  return [nextEntry, ...deduped];
}

/**
 * Combina dos arreglos de historial conservando todos los eventos únicos no-VISTO
 * y manteniendo un único registro VISTO por usuario con la marca de tiempo más reciente.
 */
export function mergeHistoryLogs(baseLogs, incomingLogs) {
  const base = safeParseHistoryLog(baseLogs);
  const incoming = safeParseHistoryLog(incomingLogs);
  const combined = [...incoming, ...base].filter((entry) => entry && typeof entry === "object");
  if (combined.length === 0) return [];

  const seenNonView = new Set();
  const result = [];

  for (const entry of combined) {
    const statusUpper = String(entry.status || "").toUpperCase().trim();
    if (statusUpper === "VISTO") {
      result.push(entry);
      continue;
    }
    const ts = String(entry.timestamp || entry.date || entry.createdAt || "").trim();
    const actor = normalizeActorName(entry.user || entry.username || entry.author || "");
    const note = String(entry.note || entry.comment || entry.message || "").trim();
    const sig = `${statusUpper}|${ts}|${actor}|${note}`;
    if (!seenNonView.has(sig)) {
      seenNonView.add(sig);
      result.push(entry);
    }
  }

  return dedupeViewHistoryLogs(result);
}

export function parseAuditActor(rawValue) {
  if (!rawValue || typeof rawValue !== "string") {
    return { name: null, sapUser: null };
  }
  const trimmed = rawValue.trim();
  if (!trimmed) return { name: null, sapUser: null };

  const sapMatch = trimmed.match(SAP_TAG_REGEX);
  const sapUser = sapMatch && sapMatch[1] ? sapMatch[1].trim() : null;
  const cleanName = trimmed.replace(SAP_TAG_REGEX, "").trim() || null;
  return { name: cleanName, sapUser };
}

function isGenericSystemActor(name) {
  const norm = normalizeActorName(name);
  return (
    !norm ||
    norm === "sistema" ||
    norm === "sap service layer" ||
    norm === "sap" ||
    norm === "sap b1" ||
    norm === "administración" ||
    norm === "administracion"
  );
}

function isSyntheticSapDirectLog(entry) {
  const note = String(entry?.note || "");
  return note.includes("Orden de Venta oficial registrada en SAP Business One");
}

function extractActorFromLogEntry(entry) {
  if (!entry || typeof entry !== "object") return { name: null, sapUser: null };
  const parsedUser = parseAuditActor(entry.user || entry.username || entry.author || "");
  if (parsedUser.name && !isGenericSystemActor(parsedUser.name)) {
    return parsedUser;
  }
  const noteMatch = String(entry.note || "").match(NOTE_ACTOR_SUFFIX_REGEX);
  if (noteMatch && noteMatch[1]) {
    const parsedFromNote = parseAuditActor(noteMatch[1]);
    if (parsedFromNote.name && !isGenericSystemActor(parsedFromNote.name)) {
      return {
        name: parsedFromNote.name,
        sapUser: parsedFromNote.sapUser || parsedUser.sapUser,
      };
    }
  }
  return { name: null, sapUser: parsedUser.sapUser };
}

/**
 * Extrae quién aprobó el proceso comercial/interno y quién envió el pedido a SAP,
 * manteniendo compatibilidad con pedidos emitidos anteriormente y órdenes directas de SAP.
 */
export function extractQuoteApprovalAudit(quote = {}) {
  if (!quote || typeof quote !== "object") {
    return {
      approvedBy: null,
      approvedAt: null,
      approvedByRole: null,
      emittedBy: null,
      emittedAt: null,
      emittedByRole: null,
      emittedSapUser: null,
      isSameActor: false,
      isLegacySapOnly: false,
    };
  }

  const totalsObj =
    typeof quote.totals === "string"
      ? (() => {
          try {
            return JSON.parse(quote.totals);
          } catch {
            return {};
          }
        })()
      : quote.totals || {};

  const logs = safeParseHistoryLog(quote.historyLog ?? totalsObj?.historyLog);
  const hasSyntheticSapLog = logs.some(isSyntheticSapDirectLog);
  const realLogs = logs.filter((entry) => entry && typeof entry === "object" && !isSyntheticSapDirectLog(entry));
  const sortedRealLogs = [...realLogs].sort((a, b) => getEntryTimeMs(b) - getEntryTimeMs(a));

  const emittedLog = sortedRealLogs.find((l) =>
    ["EMITIDO", "EMITIDO_SAP", "PEDIDO_EMITIDO", "FACTURADO"].includes(
      String(l.status || "").toUpperCase().trim()
    )
  );
  const approvedLog = sortedRealLogs.find((l) =>
    ["APROBADO", "APROBADO_COMERCIAL"].includes(
      String(l.status || "").toUpperCase().trim()
    )
  );

  const emittedFromLog = extractActorFromLogEntry(emittedLog);
  const approvedFromLog = extractActorFromLogEntry(approvedLog);

  const parsedExplicitEmitted = parseAuditActor(quote.emittedBy || totalsObj?.emittedBy || null);
  const parsedExplicitApproved = parseAuditActor(
    quote.approvedBy || totalsObj?.approvedBy || quote.evaluatedBy || totalsObj?.evaluatedBy || null
  );

  const emittedBy =
    (parsedExplicitEmitted.name && !isGenericSystemActor(parsedExplicitEmitted.name)
      ? parsedExplicitEmitted.name
      : null) ||
    emittedFromLog.name ||
    null;

  let approvedBy =
    (parsedExplicitApproved.name && !isGenericSystemActor(parsedExplicitApproved.name)
      ? parsedExplicitApproved.name
      : null) ||
    approvedFromLog.name ||
    null;

  const hasSapEmission = Boolean(
    quote.sapDocNum ||
      totalsObj?.sapDocNum ||
      quote.isSapDirect ||
      totalsObj?.isSapDirect ||
      ["EMITIDO", "EMITIDO_SAP", "PEDIDO_EMITIDO", "FACTURADO", "COMPLETADO"].includes(
        String(quote.approvalStatus || quote.state || quote.status || "").toUpperCase().trim()
      )
  );

  if (!approvedBy && emittedBy && (emittedLog?.note?.toLowerCase().includes("aprobada y emitida") || hasSapEmission)) {
    approvedBy = emittedBy;
  }

  const isSameActor = Boolean(
    approvedBy &&
      emittedBy &&
      normalizeActorName(approvedBy) === normalizeActorName(emittedBy)
  );

  const isLegacySapOnly = Boolean(
    !approvedBy &&
      !emittedBy &&
      (hasSapEmission || hasSyntheticSapLog)
  );

  return {
    approvedBy,
    approvedAt: quote.approvedAt || totalsObj?.approvedAt || approvedLog?.timestamp || null,
    approvedByRole: quote.approvedByRole || totalsObj?.approvedByRole || quote.evaluatedByRole || totalsObj?.evaluatedByRole || null,
    emittedBy,
    emittedAt: quote.emittedAt || totalsObj?.emittedAt || emittedLog?.timestamp || null,
    emittedByRole: quote.emittedByRole || totalsObj?.emittedByRole || null,
    emittedSapUser:
      quote.emittedSapUser ||
      totalsObj?.emittedSapUser ||
      parsedExplicitEmitted.sapUser ||
      emittedFromLog.sapUser ||
      null,
    isSameActor,
    isLegacySapOnly,
  };
}

/**
 * Validación estricta del permiso granular sin bypass por rol administrador ni wildcard "*".
 */
export function hasGranularApprovalAuditAccess(endpoints = []) {
  if (!Array.isArray(endpoints) || endpoints.length === 0) return false;
  return endpoints.some((e) => {
    if (!e) return false;
    const norm = String(e).trim().toUpperCase().replace(/\s+/g, " ");
    return (
      norm === "GET:/QUOTES/APPROVAL-AUDIT" ||
      norm === "GET /QUOTES/APPROVAL-AUDIT" ||
      norm === "/QUOTES/APPROVAL-AUDIT" ||
      norm === "GET:/QUOTEMODULE/QUOTES/APPROVAL-AUDIT" ||
      norm === "GET /QUOTEMODULE/QUOTES/APPROVAL-AUDIT"
    );
  });
}
