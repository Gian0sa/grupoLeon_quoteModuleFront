import { axiosInstance } from "../lib/axiosInstance";

const FALLBACK_VAPID_PUBLIC_KEY = "BH_sjnOs7sk4GdHXi2wZyENtuPuajm6ZEjac1HHpvyg_4pplxtYtbDAGmSO4Cd0o5HArMKoRDl9gHsYRNms0uTM";

/**
 * Convierte clave pública VAPID base64 a Uint8Array para el PushManager
 */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Genera un sonido elegante de campana (chime) nativo en el navegador usando Web Audio API
 * Funciona de inmediato sin descargar archivos externos de audio en Windows, Android y Mac/iOS.
 */
export function playNotificationChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Tono 1: Campana cristalina (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.28, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.6);

    // Tono 2: Armónico superior (1320 Hz - E6) ligeramente desfasado para efecto 'ding'
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, now + 0.08);
    gain2.gain.setValueAtTime(0.22, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.85);

    // Liberar el contexto de audio tras sonar para evitar agotar AudioContexts en el navegador
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1000);
  } catch (err) {
    console.warn("Audio chime no disponible:", err);
  }
}

/**
 * Verifica si el dispositivo y navegador soportan Notificaciones y Service Worker
 */
export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * Obtiene el estado actual de los permisos del navegador ('default', 'granted', 'denied')
 */
export function getNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Suscribe el dispositivo ante el Service Worker y el backend
 */
export async function subscribeToPush(user = null) {
  if (!isPushSupported()) {
    throw new Error("Las notificaciones Push no están soportadas en este navegador.");
  }

  // 1. Solicitar permiso explícito al usuario
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("Permiso de notificaciones denegado por el usuario.");
  }

  // 2. Obtener el registro activo del Service Worker
  let registration = await navigator.serviceWorker.ready;
  if (!registration) {
    registration = await navigator.serviceWorker.register("/sw.js");
  }

  // 3. Obtener la clave pública VAPID del backend
  let vapidPublicKey = FALLBACK_VAPID_PUBLIC_KEY;
  try {
    const res = await axiosInstance.get("/quoteModule/push/vapid-public-key");
    if (res.data?.publicKey) {
      vapidPublicKey = res.data.publicKey;
    }
  } catch (keyErr) {
    console.warn("⚠️ Usando VAPID public key de respaldo:", keyErr.message);
  }

  // 4. Suscribir ante el PushManager del navegador
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

  // Reusar suscripción existente si es válida
  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
  }

  // 5. Enviar la suscripción al backend para asociarla al usuario
  const payload = {
    subscription: subscription.toJSON(),
    userAgent: navigator.userAgent,
    user: user || {
      username: localStorage.getItem("username") || "vendedor",
      role: localStorage.getItem("role") || "VENDEDOR",
    },
  };

  await axiosInstance.post("/quoteModule/push/subscribe", payload);

  localStorage.setItem("grupoLeon_push_enabled", "true");

  // Reproducir sonido y confirmar al usuario con banner nativo de Windows / Android
  playNotificationChime();
  showLocalNativeNotification({
    title: "🔔 ¡Notificaciones Activadas!",
    body: "Recibirás alertas de aprobaciones y pedidos directamente en tu pantalla.",
    url: "/cotizaciones",
  });

  return subscription;
}

/**
 * Cancela la suscripción push en el dispositivo y en el servidor
 */
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      try {
        await axiosInstance.post("/quoteModule/push/unsubscribe", { endpoint });
      } catch (_) {}
    }

    localStorage.setItem("grupoLeon_push_enabled", "false");
    return true;
  } catch (err) {
    console.error("Error al cancelar suscripción push:", err);
    return false;
  }
}

/**
 * Envía una notificación de prueba directa al dispositivo a través del servidor
 */
export async function testPushNotification(username) {
  return await axiosInstance.post("/quoteModule/push/test", { username });
}

/**
 * Dispara una notificación nativa local inmediatamente en Windows / Móvil
 * (usada cuando la pestaña está en segundo plano o minimizada)
 */
export async function showLocalNativeNotification({ title, body, quoteId, url = "/cotizaciones" }) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  // Respetar si el usuario desactivó explícitamente las alertas
  if (localStorage.getItem("grupoLeon_push_enabled") === "false") return;

  // Reproducir el sonido
  playNotificationChime();

  try {
    // Si tenemos Service Worker listo, usar registration.showNotification (mejor integración en Android / Windows)
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        return reg.showNotification(title, {
          body,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          vibrate: [200, 100, 200],
          tag: quoteId ? `quote-${quoteId}` : `local-${Date.now()}`,
          renotify: true,
          data: { url, quoteId },
        });
      }
    }

    // Fallback estándar Notification API de escritorio
    const n = new Notification(title, {
      body,
      icon: "/icon-192.png",
      tag: quoteId ? `quote-${quoteId}` : `local-${Date.now()}`,
    });
    n.onclick = () => {
      window.focus();
      if (url && window.location.pathname !== url) {
        window.location.href = url;
      }
    };
  } catch (err) {
    console.warn("Error mostrando notificación nativa local:", err);
  }
}

