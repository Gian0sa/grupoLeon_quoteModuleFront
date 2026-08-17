import L from "leaflet";

/**
 * Crea un marcador de mapa estilo Teardrop (Google Maps / Mapbox) de alta calidad en SVG.
 * @param {string} color - Color hexadecimal principal del marcador
 * @param {boolean} isHovered - Si el pin está enfocado
 */
export const createPinIcon = (color = "#0e572b", isHovered = false) => {
    const size = isHovered ? 38 : 32;
    const height = isHovered ? 48 : 42;
    const anchorX = size / 2;
    const anchorY = height;

    return L.divIcon({
        className: "custom-svg-pin",
        html: `
            <div style="
                position: relative;
                width: ${size}px;
                height: ${height}px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
                transition: transform 0.2s ease;
                ${isHovered ? "transform: scale(1.15) translateY(-4px); z-index: 9999;" : ""}
            ">
                <svg width="${size}" height="${height}" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0C7.163 0 0 7.163 0 16C0 27.5 16 42 16 42C16 42 32 27.5 32 16C32 7.163 24.837 0 16 0Z" fill="${color}"/>
                    <path d="M16 2C8.268 2 2 8.268 2 16C2 25.8 14.5 38.5 16 40.1C17.5 38.5 30 25.8 30 16C30 8.268 23.732 2 16 2Z" fill="white" fill-opacity="0.15"/>
                    <circle cx="16" cy="15" r="8.5" fill="white"/>
                    <path d="M12.5 15L15 17.5L19.5 13" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </div>
        `,
        iconSize: [size, height],
        iconAnchor: [anchorX, anchorY],
        popupAnchor: [0, -height + 10],
    });
};

/**
 * Crea un marcador de mapa numerado para rutas y secuencias de visitas.
 * @param {number|string} number - Número de parada en la secuencia
 * @param {string} color - Color hexadecimal del marcador
 */
export const createNumberedIcon = (number, color = "#0e572b") => {
    const size = 36;
    const height = 46;
    const anchorX = size / 2;
    const anchorY = height;

    return L.divIcon({
        className: "custom-numbered-pin",
        html: `
            <div style="
                position: relative;
                width: ${size}px;
                height: ${height}px;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                filter: drop-shadow(0 5px 10px rgba(0,0,0,0.35));
            ">
                <svg width="${size}" height="${height}" viewBox="0 0 36 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M18 0C8.059 0 0 8.059 0 18C0 30.5 18 46 18 46C18 46 36 30.5 36 18C36 8.059 27.941 0 18 0Z" fill="${color}"/>
                    <path d="M18 2C9.163 2 2 9.163 2 18C2 28.5 16.2 42.4 18 44.1C19.8 42.4 34 28.5 34 18C34 9.163 26.837 2 18 2Z" fill="white" fill-opacity="0.18"/>
                    <circle cx="18" cy="17" r="10.5" fill="white"/>
                    <text x="18" y="21" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" font-size="12" fill="${color}" text-anchor="middle">${number}</text>
                </svg>
            </div>
        `,
        iconSize: [size, height],
        iconAnchor: [anchorX, anchorY],
        popupAnchor: [0, -height + 10],
    });
};