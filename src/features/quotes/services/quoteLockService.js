import { socket } from "../../../shared/lib/socket";
import { checkIsAdmin } from "../../../shared/utils/permissions";

const STORAGE_KEY = "grupoLeon_quote_locks";
const LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutos de gracia máxima

/**
 * Resuelve dinámicamente el título del perfil/rol del usuario
 */
export function resolveUserProfileTitle(role = "", endpoints = [], username = "", salesEmployeeCode = null) {
  const normRole = String(role || "").toUpperCase().trim();
  const normUser = String(username || "").toLowerCase().trim();
  const endpointsList = Array.isArray(endpoints) ? endpoints : [];
  const salesCode = Number(salesEmployeeCode || 0);

  if ((salesCode > 0 && salesCode !== 20) || normRole === "SELLER" || normRole === "VENDEDOR" || normRole === "ASESOR_VENTAS" || normRole.includes("VEND") || normRole.includes("ASESOR") || normUser.includes("vendedor") || normUser.includes("asdtest")) {
    return "Ventas";
  }
  if (normRole === "DIGITACION" || normRole.includes("DIGIT") || normUser.includes("digit")) {
    return "Digitación";
  }
  if (normRole === "FACTURACION" || normRole.includes("FACTUR") || normUser.includes("factur")) {
    return "Facturación";
  }
  if (normRole === "SUPERVISOR" || normRole.includes("SUPERVIS")) {
    return "Supervisor";
  }
  if (normRole === "ADMIN" || normRole.includes("ADMIN") || checkIsAdmin(endpointsList, normUser)) {
    return "Administrador";
  }
  if (endpointsList.includes("POST /quotes/approval") || endpointsList.includes("POST /quotations/approve") || normUser.includes("enrique")) {
    return "Revisión Comercial";
  }
  return "Facturación";
}

/**
 * Obtiene el mapa de bloqueos activos depurando los expirados
 */
export function getActiveQuoteLocks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const locks = raw ? JSON.parse(raw) : {};
    const now = Date.now();
    let changed = false;

    // Purgar candados vencidos o candados espurios creados por vendedores
    const active = {};
    Object.entries(locks).forEach(([key, info]) => {
      const isStale = !info || !info.expiresAt || info.expiresAt <= now;
      const profile = String(info?.lockedByProfile || "").toLowerCase();
      const user = String(info?.lockedByUsername || "").toLowerCase();
      const isSellerLock = profile.includes("ventas") || user.includes("asdtest") || user.includes("vendedor");

      if (!isStale && !isSellerLock) {
        active[key] = info;
      } else {
        changed = true;
      }
    });

    if (changed) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(active));
    }
    return active;
  } catch (e) {
    return {};
  }
}

/**
 * Verifica si una cotización está bloqueada por otro usuario
 */
export function checkQuoteLock(quoteId, currentUserId, currentUsername = null) {
  if (!quoteId) return { isLocked: false, isOwnLock: false, hasActiveLock: false, lockInfo: null };
  const idStr = String(quoteId);
  const locks = getActiveQuoteLocks();
  let lockInfo = locks[idStr];

  // Chequeo bidireccional si no se encontró directamente
  if (!lockInfo) {
    if (idStr.startsWith("COT-")) {
      const numPart = idStr.replace(/^COT-0*/, "");
      if (numPart && locks[numPart]) lockInfo = locks[numPart];
    } else if (/^\d+$/.test(idStr)) {
      const cotPart = `COT-${String(idStr).padStart(6, "0")}`;
      if (locks[cotPart]) lockInfo = locks[cotPart];
    }
  }

  if (!lockInfo) {
    return { isLocked: false, isOwnLock: false, hasActiveLock: false, lockInfo: null };
  }

  // Si expiró
  if (Date.now() > lockInfo.expiresAt) {
    return { isLocked: false, isOwnLock: false, hasActiveLock: false, lockInfo: null };
  }

  // Si el candado pertenece a un vendedor, no es un bloqueo administrativo válido
  const profile = String(lockInfo.lockedByProfile || "").toLowerCase();
  const username = String(lockInfo.lockedByUsername || "").toLowerCase();
  if (profile.includes("ventas") || username.includes("asdtest") || username.includes("vendedor")) {
    return { isLocked: false, isOwnLock: false, hasActiveLock: false, lockInfo: null };
  }

  // Si el candado pertenece al mismo usuario que lo tiene abierto (por ID o por Username)
  const lockUserId = lockInfo.lockedByUserId ? String(lockInfo.lockedByUserId) : null;
  const currentUid = currentUserId ? String(currentUserId) : null;
  const isMatchById = Boolean(lockUserId && currentUid && lockUserId === currentUid);
  const isMatchByUser = Boolean(
    currentUsername &&
    lockInfo.lockedByUsername &&
    String(currentUsername).toLowerCase().trim() === String(lockInfo.lockedByUsername).toLowerCase().trim()
  );
  const isOwn = isMatchById || isMatchByUser;

  return { isLocked: !isOwn, isOwnLock: isOwn, hasActiveLock: true, lockInfo };
}

/**
 * Adquiere el bloqueo de una cotización para un usuario
 */
export function acquireQuoteLock(quoteId, currentUser = {}, secondaryId = null) {
  if (!quoteId) return { success: false, reason: "ID requerido" };
  const idStr = String(quoteId);
  const userId = currentUser.id || currentUser.userId;

  // 🛡️ REGLA: Un VENDEDOR nunca adquiere candado de revisión ("el vendedor solo puede verlo").
  // Los candados son EXCLUSIVOS para digitación / evaluación administrativa que valida o emite a SAP.
  const normRole = String(currentUser.role || "").toUpperCase().trim();
  const normUser = String(currentUser.username || "").toLowerCase().trim();
  const endpointsList = Array.isArray(currentUser.endpoints) ? currentUser.endpoints : [];
  const salesCode = Number(currentUser.salesEmployeeCode || 0);

  const isSeller = (salesCode > 0 && salesCode !== 20) || normRole === "SELLER" || normRole === "VENDEDOR" || normRole.includes("VEND") || normUser.includes("vendedor") || normUser.includes("asdtest");
  const isEvaluator = Boolean(
    currentUser.isAdmin ||
    (!isSeller && (
      normRole === "ADMIN" ||
      normRole.includes("ADMIN") ||
      normRole === "FACTURACION" ||
      normRole.includes("FACTUR") ||
      normRole === "SUPERVISOR" ||
      normRole.includes("SUPERVIS") ||
      normRole === "DIGITACION" ||
      normRole.includes("DIGIT") ||
      checkIsAdmin(endpointsList, normUser) ||
      endpointsList.includes("POST /quotes/approval") ||
      endpointsList.includes("POST /quotations/approve")
    ))
  );

  if (!isEvaluator) {
    // Si no es evaluador administrativo, NO adquirir candado (modo solo lectura)
    return { success: false, reason: "Solo personal administrativo/digitador puede adquirir candado de revisión" };
  }

  const currentCheck = checkQuoteLock(idStr, userId);
  if (currentCheck.isLocked) {
    return { success: false, lockedBy: currentCheck.lockInfo };
  }

  const profile = currentUser.profile || resolveUserProfileTitle(currentUser.role, currentUser.endpoints, currentUser.username, currentUser.salesEmployeeCode);
  const now = Date.now();
  const lockInfo = {
    quoteId: idStr,
    lockedByUserId: userId ? String(userId) : null,
    lockedByUsername: currentUser.username || "Usuario Digitación",
    lockedByProfile: profile,
    lockedAt: new Date(now).toISOString(),
    expiresAt: now + LOCK_TTL_MS,
  };

  const locks = getActiveQuoteLocks();
  locks[idStr] = lockInfo;
  if (idStr.startsWith("COT-")) {
    const numPart = idStr.replace(/^COT-0*/, "");
    if (numPart) locks[numPart] = lockInfo;
  } else if (/^\d+$/.test(idStr)) {
    const cotPart = `COT-${String(idStr).padStart(6, "0")}`;
    locks[cotPart] = lockInfo;
  }

  if (secondaryId) {
    const secStr = String(secondaryId);
    locks[secStr] = lockInfo;
    if (secStr.startsWith("COT-")) {
      const numPart = secStr.replace(/^COT-0*/, "");
      if (numPart) locks[numPart] = lockInfo;
    } else if (/^\d+$/.test(secStr)) {
      const cotPart = `COT-${String(secStr).padStart(6, "0")}`;
      locks[cotPart] = lockInfo;
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(locks));

  // Notificar a otras pestañas y WebSocket
  window.dispatchEvent(new CustomEvent("quoteLocksUpdated", { detail: { lockInfo, type: "lock" } }));
  try {
    if (socket && socket.connected) {
      socket.emit("quote:lock", lockInfo);
    }
  } catch (e) {}

  return { success: true, lockInfo };
}

/**
 * Libera el bloqueo de una cotización
 */
export function releaseQuoteLock(quoteId, currentUserId = null, secondaryId = null) {
  if (!quoteId && !secondaryId) return;
  const idStr = String(quoteId || "");
  const locks = getActiveQuoteLocks();
  let lockInfo = idStr ? locks[idStr] : null;
  if (!lockInfo && idStr.startsWith("COT-")) {
    const numPart = idStr.replace(/^COT-0*/, "");
    if (numPart) lockInfo = locks[numPart];
  } else if (!lockInfo && /^\d+$/.test(idStr)) {
    const cotPart = `COT-${String(idStr).padStart(6, "0")}`;
    lockInfo = locks[cotPart];
  }
  if (!lockInfo && secondaryId) {
    const secStr = String(secondaryId);
    lockInfo = locks[secStr];
  }

  if (!lockInfo) return;

  // Solo el dueño del candado o si no se especificó usuario puede liberarlo
  const lockUserId = lockInfo.lockedByUserId ? String(lockInfo.lockedByUserId) : null;
  const currentUid = currentUserId ? String(currentUserId) : null;
  if (currentUid && lockUserId && currentUid !== lockUserId) {
    return; // No es el dueño del candado
  }

  if (idStr) {
    delete locks[idStr];
    if (idStr.startsWith("COT-")) {
      const numPart = idStr.replace(/^COT-0*/, "");
      if (numPart) delete locks[numPart];
    } else if (/^\d+$/.test(idStr)) {
      const cotPart = `COT-${String(idStr).padStart(6, "0")}`;
      delete locks[cotPart];
    }
  }
  if (secondaryId) {
    const secStr = String(secondaryId);
    delete locks[secStr];
    if (secStr.startsWith("COT-")) {
      const numPart = secStr.replace(/^COT-0*/, "");
      if (numPart) delete locks[numPart];
    } else if (/^\d+$/.test(secStr)) {
      const cotPart = `COT-${String(secStr).padStart(6, "0")}`;
      delete locks[cotPart];
    }
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(locks));

  window.dispatchEvent(new CustomEvent("quoteLocksUpdated", { detail: { quoteId: idStr, type: "unlock" } }));
  try {
    if (socket && socket.connected) {
      socket.emit("quote:unlock", { quoteId: idStr, userId: currentUserId });
    }
  } catch (e) {}
}

/**
 * Desbloqueo forzado por un Administrador
 */
export function forceUnlockQuote(quoteId) {
  if (!quoteId) return;
  const idStr = String(quoteId);
  const locks = getActiveQuoteLocks();
  delete locks[idStr];
  if (idStr.startsWith("COT-")) {
    const numPart = idStr.replace(/^COT-0*/, "");
    if (numPart) delete locks[numPart];
  } else if (/^\d+$/.test(idStr)) {
    const cotPart = `COT-${String(idStr).padStart(6, "0")}`;
    delete locks[cotPart];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(locks));

  window.dispatchEvent(new CustomEvent("quoteLocksUpdated", { detail: { quoteId: idStr, type: "unlock", forced: true } }));
  try {
    if (socket && socket.connected) {
      socket.emit("quote:unlock", { quoteId: idStr, forced: true });
    }
  } catch (e) {}
}

/**
 * Inicializa listeners de WebSockets para mantener los candados sincronizados en tiempo real
 */
export function initQuoteLockSocketListeners() {
  if (typeof window === "undefined") return;

  const handleSocketLock = (lockInfo) => {
    if (!lockInfo || !lockInfo.quoteId) return;
    const locks = getActiveQuoteLocks();
    locks[String(lockInfo.quoteId)] = lockInfo;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locks));
    window.dispatchEvent(new CustomEvent("quoteLocksUpdated", { detail: { lockInfo, type: "lock" } }));
  };

  const handleSocketUnlock = (data) => {
    if (!data || !data.quoteId) return;
    const locks = getActiveQuoteLocks();
    delete locks[String(data.quoteId)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locks));
    window.dispatchEvent(new CustomEvent("quoteLocksUpdated", { detail: { quoteId: String(data.quoteId), type: "unlock" } }));
  };

  try {
    socket.off("quote:lock", handleSocketLock);
    socket.off("quote:unlock", handleSocketUnlock);
    socket.on("quote:lock", handleSocketLock);
    socket.on("quote:unlock", handleSocketUnlock);
  } catch (e) {}
}

// Inicializar listeners al cargar el script
initQuoteLockSocketListeners();
