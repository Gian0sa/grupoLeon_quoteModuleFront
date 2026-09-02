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
            } catch {}
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

        return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
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
};

export const getLocation = () => {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error("GEOLOCATION_NOT_SUPPORTED"));
            return;
        }

        console.log("Solicitando ubicación...");

        navigator.geolocation.getCurrentPosition((pos) => {
            console.log("Ubicación obtenida:", pos.coords);
            resolve({latitude: pos.coords.latitude, longitude: pos.coords.longitude});
        }, (err) => {
            console.error("Error de geolocalización:", err);
            let errorMessage = "ERROR_DESCONOCIDO";

            switch (err.code) {
                case err.PERMISSION_DENIED: errorMessage = "PERMISSION_DENIED";
                    break;
                case err.POSITION_UNAVAILABLE: errorMessage = "POSITION_UNAVAILABLE";
                    break;
                case err.TIMEOUT: errorMessage = "TIMEOUT";
                    break;
            }

            reject(new Error(errorMessage));
        }, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000 
        });
    });
};