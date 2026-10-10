import axios from "axios";

/**
 * Obtiene métricas en tiempo real del hardware y la memoria del navegador.
 */
export const getDeviceMemoryMetrics = () => {
    const metrics = {
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        deviceMemoryGB: typeof navigator !== "undefined" && navigator.deviceMemory ? navigator.deviceMemory : null,
        cpuCores: typeof navigator !== "undefined" && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : null,
        networkType: null,
        memory: null,
    };

    // Tipo de conexión
    try {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (conn) {
            metrics.networkType = conn.effectiveType || conn.type || "unknown";
            metrics.saveData = conn.saveData || false;
        }
    } catch (_) {}

    // Memoria JavaScript del motor Chrome/V8
    try {
        if (typeof window !== "undefined" && window.performance && window.performance.memory) {
            const mem = window.performance.memory;
            const usedMB = Math.round(mem.usedJSHeapSize / (1024 * 1024));
            const totalMB = Math.round(mem.totalJSHeapSize / (1024 * 1024));
            const limitMB = Math.round(mem.jsHeapSizeLimit / (1024 * 1024));
            const percentageUsed = Math.round((mem.usedJSHeapSize / mem.jsHeapSizeLimit) * 100);

            metrics.memory = {
                usedMB,
                totalMB,
                limitMB,
                percentageUsed,
                isCritical: percentageUsed >= 70,
            };
        }
    } catch (_) {}

    return metrics;
};

/**
 * Envía un evento de telemetría al backend en segundo plano (fire-and-forget).
 * No interrumpe la UI ni lanza alertas al usuario.
 */
export const sendDeviceTelemetry = async (eventType, details = {}) => {
    try {
        const payload = {
            eventType,
            ...details,
            metrics: getDeviceMemoryMetrics(),
        };

        // Cliente sin interceptor de refresh/logout: la telemetría no cambia la sesión.
        await axios.post("/reportModule/visit-logs/telemetry", payload, {
            baseURL: import.meta.env.VITE_API_URL,
            withCredentials: true,
            headers: { "Content-Type": "application/json" },
            timeout: 5000,
        });
    } catch (e) {
        // La telemetría nunca debe romper la experiencia del vendedor
        console.warn("⚠️ [Telemetry] No se pudo enviar métrica en segundo plano:", e?.message);
    }
};
