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
                } canvas.width = width;
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
                                const compressedFile = new File([blob], file.name, {
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