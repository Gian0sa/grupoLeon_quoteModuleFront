import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: "...",
    iconUrl: "...",
    shadowUrl: "...",
});

export const checkInIcon = new L.Icon({
    iconUrl: "...",
    shadowUrl: "...",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});