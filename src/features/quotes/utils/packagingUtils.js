/**
 * packagingUtils.js
 * 
 * Utilidades para detectar y manejar unidades de empaque desde nombres de productos SAP.
 * SAP B1 solo factura en UNIDADES individuales, pero los vendedores compran por cajas.
 * Este módulo provee funciones puras sin efectos secundarios.
 */

/**
 * Patrones comunes de empaque en nombres de productos SAP de Grupo León.
 * Ordenados de más específico a más genérico.
 */
const PACKAGING_PATTERNS = [
  // CJ-6, CJ 6, CJ6, CJ.6, CJ/6, CJA-6, CAJA 6, CAJA6
  /\bCJ(?:A|AJA)?[-\s./]*(\d+)\b/i,
  // CJ X 6, CJA X 12, CAJA X 24, CJ*6
  /\bCJ(?:A|AJA)?\s*[Xx×*]\s*(\d+)\b/i,
  // DISPLAY X 10, DISPLAY 10, DISPLAY-10
  /\bDISPLAY\s*[Xx×*]?\s*(\d+)\b/i,
  // PTE X 10, PAQUETE 10, PACK X 4, PACK-6
  /\bP(?:TE|AQUETE|ACK)\s*[Xx×*]?\s*(\d+)\b/i,
  // BX X 8, BOX 12
  /\bB(?:X|OX)\s*[Xx×*]?\s*(\d+)\b/i,
  // SET X 3, SET 6
  /\bSET\s*[Xx×*]?\s*(\d+)\b/i,
  // BLS X 6, BOLSA 12
  /\bB(?:LS|OLSA)\s*[Xx×*]?\s*(\d+)\b/i,
  // 6 UND, 12 UNIDADES, 10 PCS
  /\b(\d+)\s*(?:UND|UNID|UNIDADES|PCS|PIEZAS)\b/i,
  // X 6, X12 al final del nombre
  /\b[Xx×*]\s*(\d+)\s*$/i,
];

/**
 * Extrae el factor de empaque del nombre del producto o de sus datos SAP.
 * 
 * @param {string} itemName - Nombre del artículo SAP (ej. "FILTRO ACEITE DL-3001 CJ-6")
 * @param {string} [sigla] - Sigla/código corto del producto (respaldo opcional)
 * @param {object} [raw] - Objeto de datos crudo de SAP (SalPackUn, NumInSale, etc.)
 * @returns {number} Factor de empaque (6, 12, 24...) o 1 si no se detecta empaque
 * 
 * @example
 * parsePackagingUnit("FILTRO ACEITE DL-3001 CJ-6")     // → 6
 * parsePackagingUnit("BUJIA NGK BKR6E CJ-12")          // → 12
 * parsePackagingUnit("ACEITE MOTOR 20W-50 CJA X 24")   // → 24
 * parsePackagingUnit("BUJIA NGK BKR6E")                 // → 1
 */
export function parsePackagingUnit(itemName, sigla, raw) {
  // 1. Si viene en el objeto raw de SAP explícitamente como número
  if (raw && typeof raw === "object") {
    const rawVal = Number(
      raw.SalPackUn ||
      raw.packagingUnit ||
      raw.SalPackQty ||
      raw.NumInSale ||
      raw.salPackUn ||
      raw.U_BPP_CANTEMPAQUE ||
      raw.U_Empaque ||
      raw.U_CANT_EMPAQUE ||
      raw.U_PAQUETE ||
      0
    );
    if (rawVal > 1 && rawVal <= 999) {
      return rawVal;
    }
  }

  // 2. Análisis por regex en nombres, siglas y campos descriptivos
  const sources = [
    itemName,
    sigla,
    raw?.ITEM_NAME,
    raw?.ItemName,
    raw?.Dscription,
    raw?.SIGLA,
    raw?.Sigla,
    raw?.description,
    raw?.U_Empaque
  ].filter(Boolean);
  
  for (const source of sources) {
    const text = String(source).toUpperCase().trim();
    for (const pattern of PACKAGING_PATTERNS) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const factor = parseInt(match[1], 10);
        if (factor > 1 && factor <= 999) {
          return factor;
        }
      }
    }
  }
  
  return 1;
}

/**
 * Extrae el porcentaje de descuento máximo de un artículo SAP si está disponible.
 * 
 * @param {object} raw - Datos del producto de SAP
 * @returns {number|null} Porcentaje máximo de descuento o null si no se especifica
 */
export function extractMaxDiscount(raw) {
  if (!raw || typeof raw !== "object") return null;
  const val = Number(
    raw.U_DescMax ||
    raw.U_BPP_CDIS ||
    raw.MaxDiscount ||
    raw.maxDiscount ||
    raw.U_MAX_DISCOUNT ||
    0
  );
  return val > 0 ? val : null;
}

/**
 * Convierte cantidad de cajas a unidades individuales.
 * 
 * @param {number} boxes - Número de cajas
 * @param {number} factor - Unidades por caja
 * @returns {number} Total en unidades
 */
export function boxesToUnits(boxes, factor) {
  const b = Math.max(0, Math.floor(Number(boxes) || 0));
  const f = Math.max(1, Number(factor) || 1);
  return b * f;
}

/**
 * Convierte unidades individuales a cajas + residuo.
 * 
 * @param {number} units - Total de unidades
 * @param {number} factor - Unidades por caja
 * @returns {{ boxes: number, remainder: number }} Cajas completas + unidades sueltas
 */
export function unitsToBoxes(units, factor) {
  const u = Math.max(0, Number(units) || 0);
  const f = Math.max(1, Number(factor) || 1);
  return {
    boxes: Math.floor(u / f),
    remainder: u % f,
  };
}

/**
 * Genera la etiqueta visual para el badge de empaque.
 * 
 * @param {number} factor - Factor de empaque
 * @returns {string} Etiqueta legible (ej. "CJ×6", "CJ×12", "UND")
 */
export function getPackagingLabel(factor) {
  const f = Number(factor) || 1;
  if (f <= 1) return "UND";
  return `CJ\u00d7${f}`;
}
