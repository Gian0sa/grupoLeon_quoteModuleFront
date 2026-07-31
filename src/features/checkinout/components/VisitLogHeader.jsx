import { TopHeaderBanner } from "../../../components/TopHeaderBanner";
import { useState, useRef } from "react";

export function VisitLogHeader() {
    const [clickCount, setClickCount] = useState(0);
    const lastClickTimeRef = useRef(0);

    const handleTitleClick = () => {
        const now = Date.now();
        if (now - lastClickTimeRef.current > 2000) {
            setClickCount(1);
        } else {
            const nextCount = clickCount + 1;
            setClickCount(nextCount);
            if (nextCount >= 5) {
                setClickCount(0);
                if (window.eruda) {
                    window.eruda.show();
                } else {
                    const script = document.createElement("script");
                    script.src = "https://cdn.jsdelivr.net/npm/eruda";
                    document.body.appendChild(script);
                    script.onload = () => {
                        window.eruda.init();
                        window.eruda.show();
                    };
                }
            }
        }
        lastClickTimeRef.current = now;
    };

    return (
        <TopHeaderBanner
            title="Registro de Visita"
            subtitle="Control de entradas, salidas y ubicación del vendedor"
            showBack={true}
            mb={6}
        />
    );
}