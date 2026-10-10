export const CHECKIN_DRAFT_KEY = "gl_checkin_draft";
export const CAMERA_PENDING_KEY = "gl_camera_pending";
export const DRAFT_MAX_AGE_MS = 30 * 60 * 1000;

export const getCheckinDraftOwner = (username, vendorCode) =>
    username ? JSON.stringify([String(username), String(vendorCode ?? "")]) : "";

export const readSessionValue = (key) => {
    try { return sessionStorage.getItem(key); } catch { return null; }
};
export const removeSessionValue = (key) => {
    try { sessionStorage.removeItem(key); } catch { /* Storage puede estar bloqueado. */ }
};
export const writeSessionValue = (key, value) => {
    try { sessionStorage.setItem(key, value); return true; } catch { return false; }
};
const isRecent = (timestamp, now, maxAge) =>
    Number.isFinite(timestamp) && timestamp > 0 && timestamp <= now && now - timestamp < maxAge;

export const readCheckinDraft = (owner, now = Date.now()) => {
    // El borrador sustituye la caché antigua, que no tenía dueño ni caducidad.
    removeSessionValue("checkin_selected_client");
    const raw = readSessionValue(CHECKIN_DRAFT_KEY);
    if (!raw) return null;
    try {
        const draft = JSON.parse(raw);
        if (!draft || draft.owner !== owner || !isRecent(draft.timestamp, now, DRAFT_MAX_AGE_MS) ||
            (draft.selectedClient != null && (typeof draft.selectedClient !== "object" || Array.isArray(draft.selectedClient))) ||
            (draft.initialClientData != null && (typeof draft.initialClientData !== "object" || Array.isArray(draft.initialClientData)))) {
            throw new Error("Invalid draft");
        }
        return {
            ...draft,
            inputValue: typeof draft.inputValue === "string" ? draft.inputValue : "",
            comment: typeof draft.comment === "string" ? draft.comment : "",
        };
    } catch {
        removeSessionValue(CHECKIN_DRAFT_KEY);
        return null;
    }
};
export const saveCheckinDraft = (draft) => {
    if (!draft.owner) return false;
    if (!draft.selectedClient && !draft.inputValue && !draft.initialClientData && !draft.comment) {
        removeSessionValue(CHECKIN_DRAFT_KEY);
        return true;
    }
    return writeSessionValue(CHECKIN_DRAFT_KEY, JSON.stringify({ ...draft, timestamp: Date.now() }));
};
export const clearCheckinDraft = () => {
    removeSessionValue(CHECKIN_DRAFT_KEY);
    removeSessionValue("checkin_selected_client");
    removeSessionValue(CAMERA_PENDING_KEY);
};
let discardReported = false;
export const consumeCameraRecovery = (wasDiscarded, now = Date.now()) => {
    const raw = readSessionValue(CAMERA_PENDING_KEY);
    const timestamp = Number(raw);
    const pendingCamera = raw !== null && isRecent(timestamp, now, DRAFT_MAX_AGE_MS);
    removeSessionValue(CAMERA_PENDING_KEY);
    const newDiscard = wasDiscarded === true && !discardReported;
    if (newDiscard) discardReported = true;
    if (!newDiscard && !pendingCamera) return null;
    return {
        wasDiscarded: wasDiscarded === true,
        pendingCamera,
        cameraPendingAgeMs: pendingCamera ? now - timestamp : null,
        detection: wasDiscarded === true ? "browser_discard" : "pending_camera_on_reload",
        // Estas señales no identifican la causa exacta del descarte ni un SIGKILL.
        oomConfirmed: false,
    };
};