import { socket } from "../../../shared/lib/socket";
import { checkIsAdmin, canForceUnlockQuote } from "../../../shared/utils/permissions";
import { useAuthStore } from "../../../features/auth/stores/useAuthStore";
import { axiosInstance } from "../../../shared/lib/axiosInstance";

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

  // 1. Roles administrativos y de control (Máxima prioridad)
  if (normRole === "ADMIN" || normRole === "ADMINISTRADOR" || normRole.includes("ADMIN") || checkIsAdmin(endpointsList, normUser)) {
    return "Administrador";
  }
  if (normRole === "FACTURACION" || normRole.includes("FACTUR") || normUser.includes("factur")) {
    return "Facturación";
  }
  if (normRole === "SUPERVISOR" || normRole.includes("SUPERVIS")) {
    return "Supervisor";
  }
  if (normRole === "DIGITACION" || normRole.includes("DIGIT") || normUser.includes("digit")) {
    return "Digitación";
  }
  if (endpointsList.includes("POST /quotes/approval") || endpointsList.includes("POST /quotations/approve") || normUser.includes("enrique")) {
    return "Revisión Comercial";
  }

  // 2. Roles comerciales / ventas
  if ((salesCode > 0 && salesCode !== 20) || normRole === "SELLER" || normRole === "VENDEDOR" || normRole === "ASESOR_VENTAS" || normRole.includes("VEND") || normRole.includes("ASESOR") || normUser.includes("vendedor") || normUser.includes("asdtest")) {
    return "Ventas";
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

    // Purgar candados vencidos con tolerancia ante diferencias de reloj (clock drift)
    const active = {};
    Object.entries(locks).forEach(([key, info]) => {
      const expiresAt = Number(info?.expiresAt || 0);
      const lockedAtMs = info?.lockedAt ? new Date(info.lockedAt).getTime() : 0;
      const isExpiredByTtl = expiresAt > 0 && now > expiresAt + (2 * 60 * 1000);
      const isExpiredByAge = lockedAtMs > 0 && !isNaN(lockedAtMs) && (now - lockedAtMs > LOCK_TTL_MS + (2 * 60 * 1000));
      const isStale = !info || (isExpiredByTtl && isExpiredByAge);

      const profile = String(info?.lockedByProfile || "").toLowerCase();
      const user = String(info?.lockedByUsername || "").toLowerCase();
      const isUserAdmin = checkIsAdmin([], user) || profile.includes("admin") || profile.includes("factur") || profile.includes("supervis") || profile.includes("digit") || profile.includes("revis");
      const isSellerLock = !isUserAdmin && (profile.includes("ventas") || user.includes("asdtest") || user.includes("vendedor"));

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

const buildAliasQuoteKeys = (rawKey) => {
  const idStr = String(rawKey || "").trim();
  if (!idStr) return [];
  const keys = new Set([idStr]);
  if (/^COT-/i.test(idStr)) {
    const numPart = idStr.replace(/^COT-(?:WEB-)?0*/i, "");
    if (numPart && /^\d+$/.test(numPart)) {
      keys.add(numPart);
      keys.add(`COT-${numPart.padStart(6, "0")}`);
      keys.add(`COT-WEB-${numPart.padStart(6, "0")}`);
    }
  } else if (/^\d+$/.test(idStr)) {
    keys.add(`COT-${idStr.padStart(6, "0")}`);
    keys.add(`COT-WEB-${idStr.padStart(6, "0")}`);
  }
  return Array.from(keys);
};

/**
 * Verifica si una cotización está bloqueada por otro usuario
 */
export function checkQuoteLock(quoteId, currentUserId, currentUsername = null) {
  if (!quoteId) return { isLocked: false, isOwnLock: false, hasActiveLock: false, lockInfo: null };
  const locks = getActiveQuoteLocks();
  const aliasKeys = buildAliasQuoteKeys(quoteId);
  const lockInfo = aliasKeys.map((k) => locks[k]).find(Boolean) || null;

  if (!lockInfo) {
    return { isLocked: false, isOwnLock: false, hasActiveLock: false, lockInfo: null };
  }

  // Si expiró con margen de tolerancia de reloj
  const now = Date.now();
  const expiresAt = Number(lockInfo.expiresAt || 0);
  const lockedAtMs = lockInfo.lockedAt ? new Date(lockInfo.lockedAt).getTime() : 0;
  if (expiresAt > 0 && now > expiresAt + 60000 && lockedAtMs > 0 && now - lockedAtMs > LOCK_TTL_MS + 60000) {
    return { isLocked: false, isOwnLock: false, hasActiveLock: false, lockInfo: null };
  }

  // Si el candado pertenece a un vendedor sin permisos administrativos
  const profile = String(lockInfo.lockedByProfile || "").toLowerCase();
  const username = String(lockInfo.lockedByUsername || "").toLowerCase();
  const isUserAdmin = checkIsAdmin([], username) || profile.includes("admin") || profile.includes("factur") || profile.includes("supervis") || profile.includes("digit") || profile.includes("revis");
  if (!isUserAdmin && (profile.includes("ventas") || username.includes("asdtest") || username.includes("vendedor"))) {
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

  const isAdminOrFact = Boolean(
    currentUser.isAdmin ||
    normRole === "ADMIN" ||
    normRole === "ADMINISTRADOR" ||
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
  );

  const isSeller = !isAdminOrFact && ((salesCode > 0 && salesCode !== 20) || normRole === "SELLER" || normRole === "VENDEDOR" || normRole.includes("VEND") || normUser.includes("vendedor") || normUser.includes("asdtest"));
  const isEvaluator = isAdminOrFact && !isSeller;

  if (!isEvaluator) {
    // Si no es evaluador administrativo, NO adquirir candado (modo solo lectura)
    return { success: false, reason: "Solo personal administrativo/digitador puede adquirir candado de revisión" };
  }

  const currentCheck = checkQuoteLock(idStr, userId, currentUser.username);
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
  for (const k of buildAliasQuoteKeys(idStr)) {
    locks[k] = lockInfo;
  }

  if (secondaryId) {
    for (const k of buildAliasQuoteKeys(secondaryId)) {
      locks[k] = lockInfo;
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
 * Libera el bloqueo de una cotización (solo por el propio dueño del candado)
 */
export function releaseQuoteLock(quoteId, currentUserId = null, secondaryId = null) {
  if (!quoteId && !secondaryId) return;
  const idStr = String(quoteId || secondaryId || "");
  const locks = getActiveQuoteLocks();
  const allKeys = [
    ...buildAliasQuoteKeys(quoteId),
    ...(secondaryId ? buildAliasQuoteKeys(secondaryId) : []),
  ];
  const lockInfo = allKeys.map((k) => locks[k]).find(Boolean) || null;

  if (!lockInfo) return;

  const authState = useAuthStore.getState?.() || {};
  const lockUserId = lockInfo.lockedByUserId ? String(lockInfo.lockedByUserId) : null;
  const currentUid = (currentUserId ?? authState.userId ?? localStorage.getItem("userId"))
    ? String(currentUserId ?? authState.userId ?? localStorage.getItem("userId"))
    : null;
  const currentUsername = String(authState.username || localStorage.getItem("username") || "").toLowerCase().trim();
  const lockUsername = String(lockInfo.lockedByUsername || "").toLowerCase().trim();

  const isOwnerById = Boolean(currentUid && lockUserId && currentUid === lockUserId);
  const isOwnerByName = Boolean(currentUsername && lockUsername && currentUsername === lockUsername);

  if ((lockUserId || lockUsername) && (currentUid || currentUsername) && !isOwnerById && !isOwnerByName) {
    return; // No es el dueño del candado
  }

  for (const k of allKeys) {
    delete locks[k];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(locks));

  window.dispatchEvent(new CustomEvent("quoteLocksUpdated", { detail: { quoteId: idStr, type: "unlock" } }));
  try {
    if (socket && socket.connected) {
      socket.emit("quote:unlock", { quoteId: idStr, userId: currentUid });
    }
  } catch (e) {}
}

/**
 * Desbloqueo forzado exclusivamente por un Administrador
 */
export function forceUnlockQuote(quoteId) {
  if (!quoteId) return false;

  const authState = useAuthStore.getState?.() || {};
  const allowed = canForceUnlockQuote({
    userId: authState.userId ?? localStorage.getItem("userId"),
    role: authState.role || localStorage.getItem("role"),
    username: authState.username || localStorage.getItem("username"),
    endpoints: authState.endpoints || [],
  });
  if (!allowed) {
    console.warn("⛔ [QuoteLock] Desbloqueo forzado denegado: solo Administradores pueden liberar revisiones de terceros.");
    return false;
  }

  const idStr = String(quoteId);
  const locks = getActiveQuoteLocks();
  for (const k of buildAliasQuoteKeys(idStr)) {
    delete locks[k];
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(locks));

  window.dispatchEvent(new CustomEvent("quoteLocksUpdated", { detail: { quoteId: idStr, type: "unlock", forced: true } }));
  try {
    if (socket && socket.connected) {
      socket.emit("quote:unlock", { quoteId: idStr, forced: true });
    }
  } catch (e) {}
  return true;
}

/**
 * Sincroniza candados activos directamente desde el backend vía REST
 */
export async function syncActiveLocksFromRest() {
  try {
    const res = await axiosInstance.get("/quoteModule/quotes/active-locks");
    if (res?.data?.locks && typeof res.data.locks === "object") {
      const current = getActiveQuoteLocks();
      const merged = { ...current, ...res.data.locks };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      window.dispatchEvent(new CustomEvent("quoteLocksUpdated", { detail: { type: "sync" } }));
    }
  } catch (e) {
    // Falla silenciosa si no hay conexión de red
  }
}

/**
 * Inicializa listeners de WebSockets para mantener los candados sincronizados en tiempo real
 */
export function initQuoteLockSocketListeners() {
  if (typeof window === "undefined") return;

  const handleSocketLock = (lockInfo) => {
    if (!lockInfo || !lockInfo.quoteId) return;
    const locks = getActiveQuoteLocks();
    for (const k of buildAliasQuoteKeys(lockInfo.quoteId)) {
      locks[k] = lockInfo;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locks));
    window.dispatchEvent(new CustomEvent("quoteLocksUpdated", { detail: { lockInfo, type: "lock" } }));
  };

  const handleSocketUnlock = (data) => {
    if (!data || !data.quoteId) return;
    const locks = getActiveQuoteLocks();
    for (const k of buildAliasQuoteKeys(data.quoteId)) {
      delete locks[k];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(locks));
    window.dispatchEvent(new CustomEvent("quoteLocksUpdated", { detail: { quoteId: String(data.quoteId), type: "unlock" } }));
  };

  const handleSocketSync = (serverLocks) => {
    if (!serverLocks || typeof serverLocks !== "object") return;
    const current = getActiveQuoteLocks();
    const merged = { ...current, ...serverLocks };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent("quoteLocksUpdated", { detail: { type: "sync" } }));
  };

  try {
    socket.off("quote:lock", handleSocketLock);
    socket.off("quote:unlock", handleSocketUnlock);
    socket.off("quote:locks:sync", handleSocketSync);

    socket.on("quote:lock", handleSocketLock);
    socket.on("quote:unlock", handleSocketUnlock);
    socket.on("quote:locks:sync", handleSocketSync);

    // Cuando el socket se conecta o reconecta, sincronizar candados del servidor
    socket.on("connect", () => {
      syncActiveLocksFromRest();
    });
  } catch (e) {}
}

// Inicializar listeners y sincronizar candados al cargar el script
initQuoteLockSocketListeners();
if (typeof window !== "undefined") {
  syncActiveLocksFromRest();
}

