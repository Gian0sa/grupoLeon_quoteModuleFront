const MAX_DIMENSION = 1200;

/**
 * Decodifica el archivo con downsampling nativo en C++ sin saturar la RAM móvil.
 */
const decodeImage = async (file) => {
    if (typeof createImageBitmap === "function") {
        try {
            // Decodificación directa con reducción a MAX_DIMENSION durante el decode
            const bitmap = await createImageBitmap(file, {
                resizeWidth: MAX_DIMENSION,
                resizeQuality: "medium"
            });
            return { source: bitmap, release: (s) => s.close?.() };
        } catch {
            try {
                const fallbackBitmap = await createImageBitmap(file);
                return { source: fallbackBitmap, release: (s) => s.close?.() };
            } catch { }
        }
    }

    const url = URL.createObjectURL(file);
    try {
        const img = await new Promise((resolve, reject) => {
            const el = new Image();
            el.onload = () => resolve(el);
            el.onerror = () => reject(new Error("Error al cargar imagen"));
            el.src = url;
        });
        return { source: img, release: () => URL.revokeObjectURL(url) };
    } catch (err) {
        URL.revokeObjectURL(url);
        throw err;
    }
};

const canvasToBlob = (canvas, quality) =>
    new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => (blob ? resolve(blob) : reject(new Error("Error al comprimir imagen"))),
            "image/jpeg",
            quality
        );
    });

export const compressImage = async (file, maxSizeMB = 1) => {
    try {
        const { source, release } = await decodeImage(file);
        let canvas;

        try {
            const naturalW = source.width;
            const naturalH = source.height;
            const scale = Math.min(1, MAX_DIMENSION / Math.max(naturalW, naturalH));
            const width = Math.round(naturalW * scale);
            const height = Math.round(naturalH * scale);

            canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            canvas.getContext("2d").drawImage(source, 0, 0, width, height);

            // Dos pasadas en lugar del bucle recursivo anterior (que podía re-codificar
            // el canvas hasta 8 veces y congelaba el teléfono). Si la primera excede
            // el objetivo, la segunda ajusta la calidad por proporción.
            let blob = await canvasToBlob(canvas, 0.72);
            const maxBytes = maxSizeMB * 1024 * 1024;

            if (blob.size > maxBytes) {
                const ratio = maxBytes / blob.size;
                const quality = Math.min(0.7, Math.max(0.35, 0.72 * Math.sqrt(ratio)));
                const retry = await canvasToBlob(canvas, quality);
                if (retry.size < blob.size) blob = retry;
            }

            console.log(
                `Imagen comprimida: ${(file.size / 1024 / 1024).toFixed(2)}MB → ${(blob.size / 1024 / 1024).toFixed(2)}MB (${width}x${height})`
            );

            const rawName = file?.name || `foto_checkin_${Date.now()}.jpg`;
            const safeName = rawName.replace(/\.[^.]+$/, "") + ".jpg";

            return new File([blob], safeName, {
                type: "image/jpeg",
                lastModified: Date.now(),
            });
        } finally {
            // Liberar explícitamente: en móviles el GC llega tarde y la siguiente
            // foto arrancaría con la memoria ya comprometida.
            release?.(source);
            if (canvas) {
                canvas.width = 0;
                canvas.height = 0;
            }
        }
    } catch (compressionError) {
        console.warn("⚠️ No se pudo comprimir la imagen en canvas, usando archivo original como respaldo:", compressionError);
        return file;
    }
};

// Memoria en sesión para coordenadas recientes válidas (evita demoras en campo)
let cachedLocation = null;
let cachedTimestamp = 0;

export const getCachedLocation = () => {
    if (cachedLocation && (Date.now() - cachedTimestamp < 5 * 60 * 1000)) {
        return cachedLocation;
    }
    return null;
};

/**
 * Obtención de ubicación ultra-robusta y tolerante a fallos para móviles:
 * 1. Intento rápido de alta precisión (GPS por satélite).
 * 2. Fallback automático a precisión de red (antenas celulares / Wi-Fi de Google).
 * 3. Escucha activa (watchPosition) durante unos segundos para cuando el usuario
 *    acaba de tocar "Aceptar" y el chip GPS del teléfono aún está encendiendo.
 * 4. Respaldo de última ubicación conocida de los últimos 5 minutos.
 */
export const getLocation = (options = {}) => {
    return new Promise(async (resolve, reject) => {
        if (typeof window === "undefined" || !navigator.geolocation) {
            return reject(new Error("GEOLOCATION_NOT_SUPPORTED"));
        }

        const saveAndResolve = (coords) => {
            const loc = {
                latitude: Number(coords.latitude),
                longitude: Number(coords.longitude),
                accuracy: coords.accuracy || null,
            };
            cachedLocation = loc;
            cachedTimestamp = Date.now();
            console.log("📍 Coordenadas GPS obtenidas exitosamente:", loc);
            resolve(loc);
        };

        const tryPosition = (highAccuracy, timeoutMs, maxAgeMs) => {
            return new Promise((res, rej) => {
                navigator.geolocation.getCurrentPosition(
                    (pos) => res(pos.coords),
                    (err) => rej(err),
                    {
                        enableHighAccuracy: highAccuracy,
                        timeout: timeoutMs,
                        maximumAge: maxAgeMs,
                    }
                );
            });
        };

        // 1. Intentar GPS de alta precisión (satelital)
        try {
            console.log("📡 Solicitando GPS (Nivel 1 - Alta precisión)...");
            const coords = await tryPosition(true, 7000, 15000);
            return saveAndResolve(coords);
        } catch (err1) {
            console.warn("⚠️ GPS alta precisión falló o demoró, intentando Nivel 2 (Red/Wi-Fi)...", err1?.message || err1);
        }

        // 2. Intentar ubicación por red móvil / Wi-Fi (funciona en interiores o con GPS en reposo)
        try {
            console.log("📡 Solicitando ubicación (Nivel 2 - Red/Wi-Fi)...");
            const coords = await tryPosition(false, 7000, 60000);
            return saveAndResolve(coords);
        } catch (err2) {
            console.warn("⚠️ Ubicación por red falló, activando Nivel 3 (watchPosition)...", err2?.message || err2);
        }

        // 3. Escucha activa (watchPosition) por hasta 6s:
        // Ideal para cuando el usuario pulsó "Aceptar" en el diálogo de Android/iOS
        // y el sistema tarda 1 a 3 segundos en activar la señal.
        try {
            const watchCoords = await new Promise((res, rej) => {
                let watchId = null;
                const timer = setTimeout(() => {
                    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
                    rej(new Error("TIMEOUT"));
                }, 6000);

                watchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        clearTimeout(timer);
                        if (watchId !== null) navigator.geolocation.clearWatch(watchId);
                        res(pos.coords);
                    },
                    (err) => {
                        console.log("watchPosition esperando señal de GPS...", err?.code);
                    },
                    {
                        enableHighAccuracy: false,
                        timeout: 6000,
                        maximumAge: 30000,
                    }
                );
            });
            return saveAndResolve(watchCoords);
        } catch (err3) {
            console.warn("⚠️ watchPosition agotó tiempo:", err3?.message || err3);
        }

        // 4. Última ubicación reciente en memoria (hasta 5 min de antigüedad)
        const cached = getCachedLocation();
        if (cached) {
            console.log("📍 Utilizando ubicación reciente en caché:", cached);
            return resolve(cached);
        }

        // Si fallaron todos los niveles
        console.error("❌ No se pudo obtener ubicación en ningún nivel.");
        reject(new Error("POSITION_UNAVAILABLE"));
    });
};