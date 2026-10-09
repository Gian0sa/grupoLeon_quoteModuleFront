/**
 * Detecta el perfil de hardware y memoria del dispositivo móvil para auto-ajustar
 * la calidad y resolución a la menor exigencia posible que garantice legibilidad
 * y cero saturación de memoria RAM (Zero-Crash / Low-Memory).
 */
export const getDeviceQualityProfile = () => {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
        return {
            profile: "BALANCED",
            maxDimension: 768,
            quality: 0.60,
            label: "Equilibrado",
            isLowEnd: false,
        };
    }

    const deviceMemory = navigator.deviceMemory || 4; // RAM en GB (ej. 0.5, 1, 2, 4, 8)
    const hardwareConcurrency = navigator.hardwareConcurrency || 4; // Núcleos de CPU
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    const isSaveData = connection?.saveData === true;
    const isSlowConnection = connection?.effectiveType === "2g" || connection?.effectiveType === "slow-2g";

    // Celulares económicos suelen tener <= 2GB de RAM o <= 4 núcleos pequeños o modo ahorro
    const isLowEnd = deviceMemory <= 2 || hardwareConcurrency <= 4 || isSaveData || isSlowConnection;

    if (isLowEnd) {
        return {
            profile: "LITE",
            maxDimension: 640,
            quality: 0.52,
            label: "Ultra-Ligero (Bajo consumo)",
            isLowEnd: true,
            deviceMemory,
        };
    }

    if (deviceMemory <= 4 || hardwareConcurrency <= 6) {
        return {
            profile: "BALANCED",
            maxDimension: 768,
            quality: 0.60,
            label: "Equilibrado",
            isLowEnd: false,
            deviceMemory,
        };
    }

    return {
        profile: "HIGH",
        maxDimension: 960,
        quality: 0.65,
        label: "Alta Definición",
        isLowEnd: false,
        deviceMemory,
    };
};

/**
 * Calcula las dimensiones proporcionales (aspect ratio intacto) sin sobrepasar maxDimension.
 */
export const calculateTargetDimensions = (origW, origH, maxDim) => {
    if (!origW || !origH) return { width: maxDim, height: maxDim };
    let w = origW;
    let h = origH;
    if (w > h) {
        if (w > maxDim) {
            h = Math.round(h * (maxDim / w));
            w = maxDim;
        }
    } else {
        if (h > maxDim) {
            w = Math.round(w * (maxDim / h));
            h = maxDim;
        }
    }
    return { width: Math.max(1, w), height: Math.max(1, h) };
};

/**
 * Extrae las dimensiones (ancho x alto) de un archivo JPEG/PNG leyendo solo
 * los primeros bytes de la cabecera (SOF marker), consumiendo 0 MB de memoria RAM.
 */
const getHeaderDimensions = async (file) => {
    try {
        if (!file || typeof file.slice !== "function") return null;
        const slice = file.slice(0, 65536);
        const buffer = await slice.arrayBuffer();
        const view = new DataView(buffer);

        // JPEG (0xFFD8)
        if (view.byteLength > 4 && view.getUint16(0) === 0xFFD8) {
            let offset = 2;
            while (offset < view.byteLength - 8) {
                const marker = view.getUint16(offset);
                offset += 2;
                // Marcadores SOF (Start of Frame): SOF0 (0xFFC0), SOF1 (0xFFC1), SOF2 (0xFFC2)
                if (marker >= 0xFFC0 && marker <= 0xFFC3) {
                    const height = view.getUint16(offset + 3);
                    const width = view.getUint16(offset + 5);
                    if (width > 0 && height > 0) {
                        return { width, height };
                    }
                }
                const length = view.getUint16(offset);
                offset += length;
            }
        }

        // PNG (0x89504E47)
        if (view.byteLength > 24 && view.getUint32(0) === 0x89504E47) {
            const width = view.getUint32(16);
            const height = view.getUint32(20);
            if (width > 0 && height > 0) {
                return { width, height };
            }
        }
    } catch (e) {
        // Fallback silencioso si la cabecera no se pudo parsear
    }
    return null;
};

/**
 * Obtiene las dimensiones originales de la foto como fallback si no se pudo leer la cabecera.
 */
const getQuickImageDimensions = (file) => {
    return new Promise((resolve) => {
        if (typeof window === "undefined") return resolve(null);
        const url = URL.createObjectURL(file);
        const img = new Image();
        let completed = false;

        const timer = setTimeout(() => {
            if (!completed) {
                completed = true;
                URL.revokeObjectURL(url);
                img.src = "";
                resolve(null);
            }
        }, 2000);

        img.onload = () => {
            if (!completed) {
                completed = true;
                clearTimeout(timer);
                const w = img.naturalWidth || img.width;
                const h = img.naturalHeight || img.height;
                URL.revokeObjectURL(url);
                img.src = "";
                resolve(w && h ? { width: w, height: h } : null);
            }
        };

        img.onerror = () => {
            if (!completed) {
                completed = true;
                clearTimeout(timer);
                URL.revokeObjectURL(url);
                img.src = "";
                resolve(null);
            }
        };

        img.src = url;
    });
};

/**
 * Compresión ultra-optimizada y adaptativa para dispositivos móviles (Zero-Crash / Zero-Leak).
 * 
 * Se auto-adapta a las capacidades del teléfono (gama baja: 640px / ~35KB, gama alta: 960px).
 * Limpia buffers de GPU y libera memoria inmediatamente tras procesar la imagen.
 */
export const compressImage = async (file, customOptions = {}) => {
    if (!file) throw new Error("No se proporcionó ningún archivo");

    // Si ya es un archivo muy liviano (< 60KB), devolverlo directamente para no saturar RAM
    if (file.size && file.size < 60 * 1024) {
        return file;
    }

    // 1. Detectar perfil de hardware del dispositivo
    const deviceProfile = getDeviceQualityProfile();
    const maxDimension = typeof customOptions === "number" 
        ? deviceProfile.maxDimension 
        : (customOptions.maxDimension || deviceProfile.maxDimension);
    const jpegQuality = typeof customOptions === "number"
        ? (customOptions <= 0.5 ? 0.50 : 0.60)
        : (customOptions.quality || deviceProfile.quality);

    // 2. Extraer dimensiones previas leyendo primero cabecera binaria (0 MB RAM)
    let origDims = await getHeaderDimensions(file);
    if (!origDims) {
        origDims = await getQuickImageDimensions(file);
    }
    const target = origDims 
        ? calculateTargetDimensions(origDims.width, origDims.height, maxDimension)
        : { width: maxDimension, height: maxDimension };

    const fileName = file.name ? file.name.replace(/\.[^/.]+$/, ".jpg") : "foto_checkin.jpg";

    // Camino 1: API nativa createImageBitmap con redimensionamiento directo en decodificación
    // Al pasarle target.width y target.height proporcionales, el motor Web NO carga los 50MP a RAM.
    if (typeof window !== "undefined" && "createImageBitmap" in window) {
        try {
            let bitmap = null;
            try {
                bitmap = await createImageBitmap(file, {
                    resizeWidth: target.width,
                    resizeHeight: target.height,
                    resizeQuality: "low",
                });
            } catch (optionsErr) {
                // Si el browser móvil no admite opciones de resize en createImageBitmap,
                // NO cargar el bitmap completo sin resize (evita consumir 200MB en RAM).
                bitmap = null;
            }

            if (bitmap) {
                const finalDims = { width: bitmap.width, height: bitmap.height };

                const canvas = document.createElement("canvas");
                canvas.width = finalDims.width;
                canvas.height = finalDims.height;
                const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
                ctx.drawImage(bitmap, 0, 0, finalDims.width, finalDims.height);
                
                // Liberar bitmap nativo de inmediato
                bitmap.close();

                const blob = await new Promise((resolve) => {
                    canvas.toBlob(resolve, "image/jpeg", jpegQuality);
                });

                // Liberar textura gráfica del canvas de la GPU inmediatamente
                canvas.width = 0;
                canvas.height = 0;

                if (blob) {
                    const finalFile = new File([blob], fileName, { type: "image/jpeg", lastModified: Date.now() });
                    finalFile.optimizedInfo = {
                        profile: deviceProfile.profile,
                        profileLabel: deviceProfile.label,
                        originalSizeKB: Math.round(file.size / 1024),
                        sizeKB: Math.round(blob.size / 1024),
                        width: finalDims.width,
                        height: finalDims.height,
                    };
                    return finalFile;
                }
            }
        } catch (bitmapError) {
            console.warn("createImageBitmap falló, activando fallback ligero con Canvas:", bitmapError);
        }
    }

    // Camino 2: Fallback estándar con Image + Canvas
    return new Promise((resolve, reject) => {
        const objectUrl = URL.createObjectURL(file);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(objectUrl);

            const finalDims = calculateTargetDimensions(
                img.naturalWidth || img.width, 
                img.naturalHeight || img.height, 
                maxDimension
            );

            const canvas = document.createElement("canvas");
            canvas.width = finalDims.width;
            canvas.height = finalDims.height;

            const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
            ctx.drawImage(img, 0, 0, finalDims.width, finalDims.height);

            // Liberar imagen de la memoria del navegador
            img.src = "";

            canvas.toBlob((blob) => {
                // Liberar buffer del canvas
                canvas.width = 0;
                canvas.height = 0;

                if (blob) {
                    const finalFile = new File([blob], fileName, { type: "image/jpeg", lastModified: Date.now() });
                    finalFile.optimizedInfo = {
                        profile: deviceProfile.profile,
                        profileLabel: deviceProfile.label,
                        originalSizeKB: Math.round(file.size / 1024),
                        sizeKB: Math.round(blob.size / 1024),
                        width: finalDims.width,
                        height: finalDims.height,
                    };
                    resolve(finalFile);
                } else {
                    reject(new Error("Error al comprimir imagen"));
                }
            }, "image/jpeg", jpegQuality);
        };

        img.onerror = () => {
            URL.revokeObjectURL(objectUrl);
            img.src = "";
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