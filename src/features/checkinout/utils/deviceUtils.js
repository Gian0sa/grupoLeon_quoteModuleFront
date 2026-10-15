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
    // 1. Revocar todas las URLs de objeto pendientes
    for (const url of previewUrls) URL.revokeObjectURL(url);
    previewUrls.clear();
    // 2. Eliminar queries inactivas del cache de React Query (conserva las activas observadas)
    try {
        queryClient.removeQueries({ type: "inactive" });
    } catch (error) {
        console.warn("Purga de queries previa a cámara falló:", error);
    }
    // 3. Sugerencia al GC de Chrome/V8 si está disponible
    if (typeof window !== "undefined" && typeof window.gc === "function") {
        try { window.gc(); } catch (_) {}
    }
    writeSessionValue(CAMERA_PENDING_KEY, String(Date.now()));
};
export const getDeviceQualityProfile = () => {
    // ─── Optimización Universal Estándar para TODOS los Dispositivos ───
    // Aplica el mismo perfil ultra-ligero y probado a todos sin categorizaciones complejas:
    // - maxDimension: 480px (suficiente para ver tienda, fachada y letrero comercial)
    // - quality: 0.50 (pesa ~35 KB, subida en menos de 1 segundo en la calle con 3G/4G)
    // - RAM mínima: evita que el teléfono colapse al procesar fotos de 50 MP
    return {
        profile: "UNIVERSAL_OPTIMIZED",
        maxDimension: 480,
        quality: 0.50,
        label: "Universal Optimizado",
        isLowEnd: true,
        isUltraLow: false,
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
 * Decodifica usando Image + Canvas (alternativa a createImageBitmap).
 * Más tolerante en dispositivos de 1 GB RAM porque el navegador planifica el decode
 * de forma incremental, sin necesitar un bloque contiguo de ~47 MB en RAM.
 */
const decodeViaImageElement = (file, targetWidth, targetHeight) => {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        const cleanup = () => URL.revokeObjectURL(url);
        img.onload = () => {
            try {
                const cv = document.createElement("canvas");
                cv.width = targetWidth;
                cv.height = targetHeight;
                const ctx = cv.getContext("2d", { alpha: false });
                if (!ctx) { cleanup(); reject(new Error("No hay memoria para el canvas")); return; }
                ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                cleanup();
                resolve(cv);
            } catch (e) { cleanup(); reject(e); }
        };
        img.onerror = () => { cleanup(); reject(new Error("Error al cargar la imagen")); };
        img.src = url;
    });
};

const isMemoryError = (error) => {
    const text = String(error?.name || "") + " " + String(error?.message || "");
    return /memory|memoria|allocat|RangeError|QuotaExceeded/i.test(text);
};

/**
 * Antes cualquier fallo de decodificación se reportaba como "memoria insuficiente",
 * aunque la causa fuera un formato no soportado (HEIC) o un archivo dañado.
 * Ahora el mensaje refleja la causa y el error original viaja en `cause` para la telemetría.
 */
const buildDecodeError = (file, firstError, lastError) => {
    const type = String(file?.type || "").toLowerCase();
    const name = String(file?.name || "").toLowerCase();
    let message;
    let reason;
    if (/hei[cf]/.test(type) || /\.hei[cf]$/.test(name)) {
        reason = "UNSUPPORTED_FORMAT";
        message = "Tu cámara guardó la foto en formato HEIC, que el navegador no puede leer. " +
            "En los ajustes de la cámara cambia el formato a JPG (\"Más compatible\") y vuelve a tomar la foto.";
    } else if (isMemoryError(firstError) || isMemoryError(lastError)) {
        reason = "OUT_OF_MEMORY";
        message = "No hay suficiente memoria libre en el celular. Cierra otras apps (TikTok, YouTube, WhatsApp) " +
            "y vuelve a presionar Tomar Fotografía.";
    } else {
        reason = "DECODE_FAILED";
        message = "No se pudo leer la foto. Vuelve a tomarla con la cámara.";
    }
    const error = new Error(message);
    error.reason = reason;
    error.cause = lastError || firstError;
    error.firstCause = firstError;
    return error;
};

/**
 * Comprime la imagen según el perfil del dispositivo.
 * ULTRA_LITE (≤1 GB RAM): usa Image+Canvas para evitar el OOM que genera createImageBitmap
 * al decodificar la foto completa (~47 MB raw para una foto de 12 MP) antes de redimensionar.
 */
export const compressImage = async (file, customOptions = {}) => {
    const options = typeof customOptions === "number" ? { quality: customOptions } : customOptions;
    const signal = options.signal;
    let bitmap = null;
    let canvas = null;
    let firstDecodeError = null;
    try {
        if (!file) throw new Error("No se proporcionó ningún archivo");
        checkAborted(signal);
        const original = await getHeaderDimensions(file);
        checkAborted(signal);
        if (!original && /hei[cf]/i.test(String(file.type) + String(file.name))) throw buildDecodeError(file, null, null);
        if (!original) throw new Error("No pudimos leer esta foto de forma segura. Utiliza una imagen JPEG, PNG o WebP con menor resolución.");
        if (typeof createImageBitmap !== "function" && typeof Image === "undefined") {
            throw new Error("Actualiza tu navegador para procesar fotografías de forma segura.");
        }
        const profile = getDeviceQualityProfile();
        const maxDimension = Number.isFinite(options.maxDimension)
            ? Math.max(1, Math.min(768, Math.round(options.maxDimension))) : profile.maxDimension;
        const quality = Number.isFinite(options.quality) ? Math.max(0.1, Math.min(1, options.quality)) : profile.quality;
        const target = calculateTargetDimensions(original.width, original.height, maxDimension);

        // ─── Decodificación Segura Universal para evitar picos de 200 MB en RAM ───
        // Si el archivo pesa más de 1.5 MB (típico de fotos de 12 MP a 50 MP de celulares como Honor X6b, Xiaomi o Samsung),
        // usamos decodeViaImageElement que redimensiona directo al canvas sin cargar el bitmap completo de 200 MB en RAM.
        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > 1.5 || typeof createImageBitmap !== "function") {
            checkAborted(signal);
            try {
                canvas = await decodeViaImageElement(file, target.width, target.height);
            } catch {
                checkAborted(signal);
                const nanoTarget = calculateTargetDimensions(original.width, original.height, 360);
                await new Promise((r) => setTimeout(r, 200));
                canvas = await decodeViaImageElement(file, nanoTarget.width, nanoTarget.height);
            }
            const blob = await new Promise((resolve, reject) => {
                canvas.toBlob(
                    (v) => v ? resolve(v) : reject(new Error("No se pudo comprimir la foto")),
                    "image/jpeg", quality
                );
            });
            checkAborted(signal);
            const fileName = file.name ? file.name.replace(/\.[^/.]+$/, "") + ".jpg" : "foto_checkin.jpg";
            const result = new File([blob], fileName, { type: "image/jpeg", lastModified: Date.now() });
            result.optimizedInfo = {
                profile: "UNIVERSAL_OPTIMIZED", profileLabel: "Universal Optimizado",
                originalSizeKB: Math.round(file.size / 1024), sizeKB: Math.round(blob.size / 1024),
                width: target.width, height: target.height,
            };
            return result;
        }

        // ─── Ruta normal para archivos pequeños: createImageBitmap ────────────────
        try {
            bitmap = await createImageBitmap(file, {
                resizeWidth: target.width, resizeHeight: target.height,
                resizeQuality: "low", imageOrientation: "from-image",
            });
        } catch (bitmapError) {
            checkAborted(signal);
            firstDecodeError = bitmapError;
            // Fallback 1 — 320px + pausa para liberar el decodificador anterior
            const fallbackTarget = calculateTargetDimensions(original.width, original.height, 320);
            try {
                await new Promise((r) => setTimeout(r, 250));
                bitmap = await createImageBitmap(file, {
                    resizeWidth: fallbackTarget.width, resizeHeight: fallbackTarget.height,
                    resizeQuality: "low", imageOrientation: "from-image",
                });
            } catch {
                checkAborted(signal);
                // Fallback 2 — Image+Canvas (evita createImageBitmap completamente)
                try {
                    await new Promise((r) => setTimeout(r, 400));
                    const nanoTarget = calculateTargetDimensions(original.width, original.height, 280);
                    canvas = await decodeViaImageElement(file, nanoTarget.width, nanoTarget.height);
                    const blob = await new Promise((resolve, reject) => {
                        canvas.toBlob(
                            (v) => v ? resolve(v) : reject(new Error("No se pudo comprimir la foto")),
                            "image/jpeg", 0.45
                        );
                    });
                    checkAborted(signal);
                    const fName = file.name ? file.name.replace(/\.[^/.]+$/, "") + ".jpg" : "foto_checkin.jpg";
                    const result = new File([blob], fName, { type: "image/jpeg", lastModified: Date.now() });
                    result.optimizedInfo = {
                        profile: "FALLBACK", profileLabel: "Modo compatibilidad",
                        originalSizeKB: Math.round(file.size / 1024), sizeKB: Math.round(blob.size / 1024),
                        width: nanoTarget.width, height: nanoTarget.height,
                    };
                    return result;
                } catch (fallbackError) {
                    if (fallbackError?.name === "AbortError") throw fallbackError;
                    throw buildDecodeError(file, firstDecodeError, fallbackError);
                }
            }
        }
        checkAborted(signal);
        if (bitmap && (Math.abs(bitmap.width - target.width) > 2 || Math.abs(bitmap.height - target.height) > 2)) {
            throw new Error("El navegador no redujo la foto de forma segura. Actualiza el navegador o toma una foto con menor resolución.");
        }
        canvas = document.createElement("canvas");
        canvas.width = target.width;
        canvas.height = target.height;
        const context = canvas.getContext("2d", { alpha: false, desynchronized: true });
        if (!context) throw new Error("No hay memoria disponible para procesar la foto. Intenta nuevamente.");
        context.drawImage(bitmap, 0, 0, target.width, target.height);
        bitmap.close();
        bitmap = null;
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((v) => v ? resolve(v) : reject(new Error("No se pudo comprimir la foto")), "image/jpeg", quality);
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