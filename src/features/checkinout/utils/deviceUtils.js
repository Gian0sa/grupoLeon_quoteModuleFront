/**
 * Compresión ultra-optimizada para dispositivos móviles (Zero-Crash / Low Memory).
 * 
 * Utiliza `createImageBitmap` nativo con redimensionado en decodificación cuando está disponible,
 * evitando cargar mapas de bits de 50 Megapíxeles o strings Base64 gigantes en la memoria RAM del teléfono.
 * Si falla o no está soportado, usa `URL.createObjectURL` en lugar de FileReader.
 */
export const compressImage = async (file, maxSizeMB = 0.35) => {
    if (!file) throw new Error("No se proporcionó ningún archivo");

    // 960px es nítido y perfecto para pantallas móviles y auditoría, pero pesa menos de 100KB y usa mínima RAM
    const MAX_DIMENSION = 960;
    const JPEG_QUALITY = 0.65;

    // Camino 1: API nativa createImageBitmap con redimensionamiento directo en decodificación (ultra eficiente en RAM)
    if (typeof window !== "undefined" && "createImageBitmap" in window) {
        try {
            let bitmap;
            try {
                // Algunos navegadores soportan opciones de resize directamente en createImageBitmap
                bitmap = await createImageBitmap(file, {
                    resizeWidth: MAX_DIMENSION,
                    resizeHeight: MAX_DIMENSION,
                    resizeQuality: "medium",
                });
            } catch (e) {
                // Fallback de createImageBitmap sin opciones
                bitmap = await createImageBitmap(file);
            }

            if (bitmap) {
                let width = bitmap.width;
                let height = bitmap.height;

                if (width > height) {
                    if (width > MAX_DIMENSION) {
                        height = Math.round(height * (MAX_DIMENSION / width));
                        width = MAX_DIMENSION;
                    }
                } else {
                    if (height > MAX_DIMENSION) {
                        width = Math.round(width * (MAX_DIMENSION / height));
                        height = MAX_DIMENSION;
                    }
                }

                const canvas = document.createElement("canvas");
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext("2d", { alpha: false });
                ctx.drawImage(bitmap, 0, 0, width, height);
                bitmap.close(); // Liberar memoria nativa del bitmap de inmediato

                const blob = await new Promise((resolve) => {
                    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
                });

                if (blob) {
                    const fileName = file.name ? file.name.replace(/\.[^/.]+$/, ".jpg") : "foto_checkin.jpg";
                    return new File([blob], fileName, { type: "image/jpeg", lastModified: Date.now() });
                }
            }
        } catch (bitmapError) {
            console.warn("createImageBitmap no disponible o falló, usando fallback con Blob URL:", bitmapError);
        }
    }

    // Camino 2: Fallback con URL.createObjectURL (mucho más ligero en RAM que FileReader.readAsDataURL)
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(objectUrl); // Liberar URL de inmediato

            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_DIMENSION) {
                    height = Math.round(height * (MAX_DIMENSION / width));
                    width = MAX_DIMENSION;
                }
            } else {
                if (height > MAX_DIMENSION) {
                    width = Math.round(width * (MAX_DIMENSION / height));
                    height = MAX_DIMENSION;
                }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d", { alpha: false });
            ctx.drawImage(img, 0, 0, width, height);

            canvas.toBlob((blob) => {
                if (blob) {
                    const fileName = file.name ? file.name.replace(/\.[^/.]+$/, ".jpg") : "foto_checkin.jpg";
                    resolve(new File([blob], fileName, { type: "image/jpeg", lastModified: Date.now() }));
                } else {
                    reject(new Error("Error al procesar la imagen"));
                }
            }, "image/jpeg", JPEG_QUALITY);
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error("No se pudo cargar la imagen para compresión"));
        };

        img.src = objectUrl;
    });
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