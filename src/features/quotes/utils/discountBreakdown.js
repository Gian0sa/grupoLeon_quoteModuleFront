/**
 * Utilidades puras y compartidas para detectar artículos con Convenio Cliente (OSPP)
 * y calcular los campos UDF de descuento SAP (U_TQC_DESL, U_TQC_DELP, U_TQC_DESV).
 */

/**
 * Convierte un valor opcional a número finito o null si es vacío/inválido.
 */
export function parseOptionalFiniteNumber(value) {
  if (value === undefined || value === null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

/**
 * Determina si una línea corresponde a un artículo con Convenio Cliente (OSPP).
 */
export function isSpecialAgreementItem(item) {
  if (!item || typeof item !== "object") return false;
  const sapDisc = Number(item.sapDiscount ?? item.discount ?? item.Discount ?? 0);
  const specialPrice = Number(item.specialPrice ?? 0);
  const specialDiscount = Number(item.specialDiscount ?? 0);

  return Boolean(
    item.isSpecialPrice ||
      item.campaignName === "Convenio Cliente" ||
      (Number.isFinite(specialPrice) && specialPrice > 0) ||
      (Number.isFinite(specialDiscount) && specialDiscount > 0) ||
      (Number.isFinite(sapDisc) && sapDisc > 55.0)
  );
}

/**
 * Calcula los porcentajes y valores TQC para una línea de documento SAP.
 *
 * Regla anti-legado:
 * Si el ítem es de Convenio (OSPP) y `baseListDiscount` coincide con `totalDisc`
 * y `sapDisc === totalDisc` (> 0), se asume que proviene de un registro legado que
 * copió el descuento total del convenio como descuento de lista, por lo que se
 * retorna `null` para que el backend resuelva el descuento real de lista (*1) en SAP.
 */
export function computeSapTqcBreakdown({ item, sapUnitPrice, sapDisc, totalDisc }) {
  const isSpecial = isSpecialAgreementItem(item);
  const rawBaseList = parseOptionalFiniteNumber(item?.baseListDiscount);
  const normalizedSapDisc = Number(Number(sapDisc || 0).toFixed(2));
  const normalizedTotalDisc = Number(Number(totalDisc || 0).toFixed(2));

  const isLegacyCopiedBaseList =
    isSpecial &&
    rawBaseList !== null &&
    normalizedTotalDisc > 0 &&
    Math.abs(Number(rawBaseList.toFixed(2)) - normalizedTotalDisc) < 0.001 &&
    Math.abs(normalizedSapDisc - normalizedTotalDisc) < 0.001;

  const descListaPct = isSpecial
    ? (rawBaseList !== null && !isLegacyCopiedBaseList ? Number(rawBaseList.toFixed(2)) : null)
    : normalizedSapDisc;

  if (descListaPct === null) {
    return {
      descListaPct: null,
      valorDescLista: null,
      descVenta: null,
    };
  }

  const unit = Number(sapUnitPrice || 0);
  const valorDescLista = Number((unit * (1 - descListaPct / 100)).toFixed(2));
  const descVenta = Number((Number(totalDisc || 0) - descListaPct).toFixed(2));

  return {
    descListaPct,
    valorDescLista,
    descVenta,
  };
}
