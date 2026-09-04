export const compressImage = (file, maxSizeMB = 1) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Reducir dimensiones si es muy grande
                const MAX_WIDTH = 1920;
                const MAX_HEIGHT = 1920;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Comprimir con calidad variable hasta lograr el tamaño deseado
                let quality = 0.8;
                const compress = () => {
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const sizeMB = blob.size / 1024 / 1024;
                            console.log(`Imagen comprimida: ${
                                sizeMB.toFixed(2)
                            }MB con calidad ${quality}`);

                            if (sizeMB > maxSizeMB && quality > 0.1) {
                                quality -= 0.1;
                                compress();
                            } else {
                                const fileName = file?.name || "foto_checkin.jpg";
                                const compressedFile = new File([blob], fileName, {
                                    type: 'image/jpeg',
                                    lastModified: Date.now()
                                });
                                resolve(compressedFile);
                            }
                        } else {
                            reject(new Error('Error al comprimir imagen'));
                        }
                    }, 'image/jpeg', quality);
                };

                compress();
            };
            img.onerror = () => reject(new Error('Error al cargar imagen'));
        };
        reader.onerror = () => reject(new Error('Error al leer archivo'));
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