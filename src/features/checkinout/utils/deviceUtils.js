import { queryClient } from "../../../shared/lib/queryClient";
import { CAMERA_PENDING_KEY, readSessionValue, removeSessionValue, writeSessionValue } from "./checkinSession";

const previewUrls = new Set();
export const createImagePreviewUrl = (file) => {
    const url = URL.createObjectURL(file);
    previewUrls.add(url);
    return url;
};
export const revokeImagePreviewUrl = (url) => {
    if (url && previewUrls.delete(url)) URL.revokeObjectURL(url);
};
export const clearCameraPending = () => removeSessionValue(CAMERA_PENDING_KEY);
export const purgeMemoryBeforeCamera = () => {
    for (const url of previewUrls) URL.revokeObjectURL(url);
    previewUrls.clear();
    try { queryClient.removeQueries({ type: "inactive" }); }
    catch (error) { console.warn("Purga de queries previa a cámara falló:", error); }
    writeSessionValue(CAMERA_PENDING_KEY, String(Date.now()));
};
export const getDeviceQualityProfile = () => {
    const deviceMemory = typeof navigator !== "undefined" ? navigator.deviceMemory || 4 : 4;
    const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
    const connection = typeof navigator !== "undefined"
        ? navigator.connection || navigator.mozConnection || navigator.webkitConnection : null;
    const isLowEnd = deviceMemory <= 2 || cores <= 4 || connection?.saveData === true ||
        ["2g", "slow-2g"].includes(connection?.effectiveType);
    return {
        profile: isLowEnd ? "LITE" : "BALANCED",
        maxDimension: isLowEnd ? 640 : 768,
        quality: isLowEnd ? 0.52 : 0.60,
        label: isLowEnd ? "Ultra-Ligero (Bajo consumo)" : "Equilibrado",
        isLowEnd, deviceMemory,
    };
};
export const calculateTargetDimensions = (width, height, maxDimension) => {
    const scale = Math.min(1, maxDimension / Math.max(width, height));
    return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
};
const readExifOrientation = (view, start, end) => {
    try {
        if (end - start < 14 || view.getUint32(start) !== 0x45786966 || view.getUint16(start + 4) !== 0) return 1;
        const tiff = start + 6;
        const byteOrder = view.getUint16(tiff);
        if (byteOrder !== 0x4949 && byteOrder !== 0x4D4D) return 1;
        const littleEndian = byteOrder === 0x4949;
        if (view.getUint16(tiff + 2, littleEndian) !== 42) return 1;
        const ifd = tiff + view.getUint32(tiff + 4, littleEndian);
        if (ifd < tiff + 8 || ifd + 2 > end) return 1;
        const entries = view.getUint16(ifd, littleEndian);
        for (let i = 0; i < entries; i++) {
            const offset = ifd + 2 + i * 12;
            if (offset + 12 > end) break;
            if (view.getUint16(offset, littleEndian) === 0x0112 &&
                view.getUint16(offset + 2, littleEndian) === 3 &&
                view.getUint32(offset + 4, littleEndian) === 1) {
                const orientation = view.getUint16(offset + 8, littleEndian);
                return orientation >= 1 && orientation <= 8 ? orientation : 1;
            }
        }
    } catch { /* EXIF incompleto: conservar la orientación por defecto. */ }
    return 1;
};
/** Lee como máximo 64 KiB de cabecera; nunca decodifica píxeles para medirlos. */
export const getHeaderDimensions = async (file) => {
    if (!file || typeof file.slice !== "function") return null;
    const view = new DataView(await file.slice(0, 65536).arrayBuffer());
    const size = view.byteLength;
    if (size >= 4 && view.getUint16(0) === 0xFFD8) {
        const sofMarkers = new Set([0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF]);
        let offset = 2;
        let dimensions = null;
        let orientation = 1;
        while (offset + 1 < size) {
            if (view.getUint8(offset++) !== 0xFF) return null;
            while (offset < size && view.getUint8(offset) === 0xFF) offset++;
            if (offset >= size) break;
            const marker = view.getUint8(offset++);
            if (marker === 0xDA || marker === 0xD9) break;
            if (marker === 0x01 || (marker >= 0xD0 && marker <= 0xD8)) continue;
            if (offset + 2 > size) break;
            const length = view.getUint16(offset);
            if (length < 2 || offset + length > size) break;
            if (marker === 0xE1 && length >= 8 && view.getUint32(offset + 2) === 0x45786966) {
                orientation = readExifOrientation(view, offset + 2, offset + length);
            }
            if (sofMarkers.has(marker) && length >= 8) {
                const height = view.getUint16(offset + 3);
                const width = view.getUint16(offset + 5);
                if (width && height) dimensions = { width, height };
            }
            offset += length;
        }
        if (!dimensions) return null;
        return orientation >= 5 ? { width: dimensions.height, height: dimensions.width } : dimensions;
    }
    if (size >= 33 && view.getUint32(0) === 0x89504E47 && view.getUint32(4) === 0x0D0A1A0A &&
        view.getUint32(8) === 13 && view.getUint32(12) === 0x49484452) {
        const width = view.getUint32(16);
        const height = view.getUint32(20);
        return width && height ? { width, height } : null;
    }
    // WebP: VP8, VP8L y VP8X declaran las dimensiones sin decodificar.
    if (size >= 30 && view.getUint32(0) === 0x52494646 && view.getUint32(8) === 0x57454250) {
        const type = view.getUint32(12);
        const uint24 = (offset) => view.getUint8(offset) | view.getUint8(offset + 1) << 8 | view.getUint8(offset + 2) << 16;
        if (type === 0x56503858) return { width: uint24(24) + 1, height: uint24(27) + 1 };
        if (type === 0x56503820 && view.getUint8(23) === 0x9D && view.getUint8(24) === 1 && view.getUint8(25) === 0x2A) {
            const width = view.getUint16(26, true) & 0x3FFF;
            const height = view.getUint16(28, true) & 0x3FFF;
            return width && height ? { width, height } : null;
        }
        if (type === 0x5650384C && view.getUint8(20) === 0x2F) {
            const bits = view.getUint32(21, true);
            return { width: (bits & 0x3FFF) + 1, height: ((bits >>> 14) & 0x3FFF) + 1 };
        }
    }
    return null;
};
const checkAborted = (signal) => {
    if (signal?.aborted) throw new DOMException("Procesamiento cancelado", "AbortError");
};
/**
 * Solicita un bitmap reducido. El pico interno del decodificador depende del navegador;
 * no se reintenta con Image ni con un bitmap de tamaño completo.
 */
export const compressImage = async (file, customOptions = {}) => {
    const options = typeof customOptions === "number" ? { quality: customOptions } : customOptions;
    const signal = options.signal;
    let bitmap = null;
    let canvas = null;
    try {
        if (!file) throw new Error("No se proporcionó ningún archivo");
        checkAborted(signal);
        const original = await getHeaderDimensions(file);
        checkAborted(signal);
        if (!original) throw new Error("No pudimos leer esta foto de forma segura. Utiliza una imagen JPEG, PNG o WebP con menor resolución.");
        if (typeof createImageBitmap !== "function") throw new Error("Actualiza tu navegador para procesar fotografías de forma segura.");
        const profile = getDeviceQualityProfile();
        const maxDimension = Number.isFinite(options.maxDimension)
            ? Math.max(1, Math.min(768, Math.round(options.maxDimension))) : profile.maxDimension;
        const quality = Number.isFinite(options.quality) ? Math.max(0.1, Math.min(1, options.quality)) : profile.quality;
        const target = calculateTargetDimensions(original.width, original.height, maxDimension);
        bitmap = await createImageBitmap(file, {
            resizeWidth: target.width, resizeHeight: target.height, resizeQuality: "low", imageOrientation: "from-image",
        });
        checkAborted(signal);
        if (bitmap.width !== target.width || bitmap.height !== target.height) {
            throw new Error("El navegador no redujo la foto de forma segura. Actualiza el navegador o toma una foto con menor resolución.");
        }
        canvas = document.createElement("canvas");
        canvas.width = target.width;
        canvas.height = target.height;
        const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
        if (!context) throw new Error("No hay memoria disponible para procesar la foto. Intenta nuevamente.");
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        bitmap = null;
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((value) => value ? resolve(value) : reject(new Error("No se pudo comprimir la foto")), "image/jpeg", quality);
        });
        checkAborted(signal);
        const fileName = file.name ? file.name.replace(/\.[^/.]+$/, "") + ".jpg" : "foto_checkin.jpg";
        const result = new File([blob], fileName, { type: "image/jpeg", lastModified: Date.now() });
        result.optimizedInfo = {
            profile: profile.profile, profileLabel: profile.label,
            originalSizeKB: Math.round(file.size / 1024), sizeKB: Math.round(blob.size / 1024),
            width: target.width, height: target.height,
        };
        return result;
    } finally {
        if (bitmap) bitmap.close();
        if (canvas) { canvas.width = 0; canvas.height = 0; }
        clearCameraPending();
    }
};
// Memoria en sesión para coordenadas recientes válidas (evita demoras en campo)
const LOCATION_CACHE_KEY = "gl_checkin_location";
const LOCATION_MAX_AGE_MS = 5 * 60 * 1000;
let cachedLocation = null;
let cachedTimestamp = 0;

export const getCachedLocation = () => {
    if (!cachedLocation) {
        try {
            const saved = JSON.parse(readSessionValue(LOCATION_CACHE_KEY));
            if (saved && Number.isFinite(saved.timestamp) && saved.timestamp <= Date.now() &&
                Date.now() - saved.timestamp < LOCATION_MAX_AGE_MS &&
                Number.isFinite(saved.location?.latitude) && Math.abs(saved.location.latitude) <= 90 &&
                Number.isFinite(saved.location?.longitude) && Math.abs(saved.location.longitude) <= 180) {
                cachedLocation = saved.location;
                cachedTimestamp = saved.timestamp;
            }
        } catch { /* Coordenadas ausentes o inválidas. */ }
    }
    if (cachedLocation && Date.now() - cachedTimestamp < LOCATION_MAX_AGE_MS) {
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
            writeSessionValue(LOCATION_CACHE_KEY, JSON.stringify({ location: loc, timestamp: cachedTimestamp }));
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