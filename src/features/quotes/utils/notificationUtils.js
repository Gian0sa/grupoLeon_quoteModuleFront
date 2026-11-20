export function getNotificationCanonicalKey(notif) {
  if (!notif || typeof notif !== "object") return "";
  const rawQ = String(notif.quoteId || notif.id || "").trim();
  const matchWeb =
    String(notif.title || "").match(/COT-WEB-(\d+)/i) ||
    String(notif.title || "").match(/COT-(\d+)/i) ||
    rawQ.match(/COT-WEB-(\d+)/i) ||
    rawQ.match(/COT-(\d+)/i) ||
    rawQ.match(/^(\d+)$/);
  return matchWeb ? `QUOTE-${Number(matchWeb[1])}` : rawQ;
}

export function getNotificationTimestampMs(notif) {
  if (!notif || typeof notif !== "object") return 0;
  const raw = notif.createdAt || notif.timestamp || notif.created_at || notif.date || notif.updatedAt;
  if (typeof raw === "number") return raw;
  if (raw) {
    const t = new Date(raw).getTime();
    if (!Number.isNaN(t) && t > 0) return t;
  }
  const numId = Number(notif.id);
  if (!Number.isNaN(numId) && numId > 0) return numId;
  return 0;
}

/**
 * Reconcilia notificaciones locales (WebSocket / localStorage) con las del servidor (/notifications).
 * Si el servidor ya respondió y no incluye una alerta local con más de 15s de antigüedad
 * (porque la cotización ya se emitió a SAP, aprobó o anuló), la purga para evitar alertas fantasma.
 */
export function mergeServerAndLocalNotifications(
  rawLocal,
  serverNotifs,
  { nowMs = Date.now(), recentWindowMs = 15000 } = {}
) {
  const safeLocal = Array.isArray(rawLocal) ? rawLocal : [];
  if (!Array.isArray(serverNotifs)) {
    return { combined: safeLocal, freshLocal: safeLocal, didPruneLocal: false };
  }

  const serverKeySet = new Set(
    serverNotifs.map((n) => getNotificationCanonicalKey(n)).filter(Boolean)
  );

  const freshLocal = safeLocal.filter((n) => {
    const key = getNotificationCanonicalKey(n);
    if (key && serverKeySet.has(key)) return true;
    const ts = getNotificationTimestampMs(n);
    return ts > 0 && nowMs - ts <= recentWindowMs;
  });

  return {
    combined: [...freshLocal, ...serverNotifs],
    freshLocal,
    didPruneLocal: freshLocal.length !== safeLocal.length,
  };
}

/**
 * Formatea fecha/hora de alerta comparando calendario real en Perú (America/Lima)
 * para evitar etiquetar como "Hoy" una alerta de ayer ("Hace 19 h").
 */
export function formatNotificationTimeAgo(dateStr, nowDate = new Date()) {
  if (!dateStr) return "Hace un momento";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "Hace un momento";

  const diffMs = nowDate.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);

  const timeStr = date.toLocaleTimeString("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  if (diffMins < 1) return `Ahora mismo • ${timeStr}`;
  if (diffMins < 60) return `Hace ${diffMins} min • ${timeStr}`;

  const datePeru = date.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const todayPeru = nowDate.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  const yesterdayPeru = new Date(nowDate.getTime() - 24 * 60 * 60 * 1000).toLocaleDateString("en-CA", {
    timeZone: "America/Lima",
  });

  if (datePeru === todayPeru) {
    return `Hoy a las ${timeStr} • Hace ${diffHours} h`;
  }
  if (datePeru === yesterdayPeru) {
    return `Ayer a las ${timeStr}`;
  }

  const dayNum = date.toLocaleDateString("es-PE", {
    timeZone: "America/Lima",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return `${dayNum} • ${timeStr}`;
}
