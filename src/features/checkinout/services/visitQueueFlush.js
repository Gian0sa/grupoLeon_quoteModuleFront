/**
 * Puente entre la cola de visitas y el cierre de sesión.
 *
 * El logout limpia el token y las cookies; si en ese momento quedaban marcas sin
 * enviar, se quedaban esperando a que el vendedor volviera a entrar y a abrir
 * justo la pantalla de visitas. Registrando aquí la función de sincronización,
 * el logout puede darle una última oportunidad de subir mientras la sesión aún
 * es válida.
 *
 * Se mantiene fuera de React a propósito: el store de auth no debe depender de
 * hooks ni de un árbol de componentes montado.
 */
let flushFn = null;

export const registerVisitQueueFlush = (fn) => {
  flushFn = fn;
};

export const unregisterVisitQueueFlush = () => {
  flushFn = null;
};

/**
 * Intenta vaciar la cola sin bloquear el cierre de sesión.
 * Si no hay conexión o el envío tarda, se abandona en silencio: los datos siguen
 * en IndexedDB y se reintentarán en el próximo ingreso.
 */
export const flushVisitQueue = async (timeoutMs = 4000) => {
  if (typeof flushFn !== "function") return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  try {
    await Promise.race([
      Promise.resolve(flushFn()),
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  } catch (err) {
    console.warn("No se pudo vaciar la cola de visitas antes de cerrar sesión:", err);
  }
};
