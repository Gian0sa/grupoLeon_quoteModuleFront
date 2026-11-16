/**
 * Conciliación SOLO VISUAL de totales de línea contra el documento oficial de SAP.
 *
 * Contexto: para líneas enviadas por la rama bruta (precio con IGV: convenio / precio editado /
 * Oferta del Mes), SAP calcula el neto de cada línea pasando por la moneda local
 * (neto USD -> soles redondeado -> USD redondeado). Por eso, al volver a mostrar una orden ya
 * emitida, recalcular `cantidad × precio neto` en USD puede diferir ±0.01 en alguna línea
 * (ej. Orden #22252: web 1,286.92 vs SAP 1,286.91), aunque el total del documento sí cuadra.
 *
 * Esta función NO toca el envío a SAP ni los datos guardados: solo reparte el residuo de
 * redondeo (diferencia entre el neto oficial de SAP y la suma de líneas calculadas) sobre las
 * líneas cuyo neto quedó más cerca del límite de redondeo, que son las que SAP voltea.
 */

const toCents = (value) => Math.round(Number(value || 0) * 100);

/**
 * @param {Array<{ rawLineTotal: number }>} lines Netos sin redondear por línea (cantidad × precio neto).
 * @param {number} officialNet Valor venta neto oficial del documento SAP (subtotal sin IGV).
 * @returns {number[]} Totales de línea a mostrar (2 decimales), en el mismo orden.
 */
export function reconcileLineTotalsWithSap(lines = [], officialNet = 0) {
  const rounded = lines.map((line) => toCents(line.rawLineTotal));
  const toAmounts = (cents) => cents.map((c) => Number((c / 100).toFixed(2)));

  const officialCents = toCents(officialNet);
  if (!officialCents || lines.length === 0) return toAmounts(rounded);

  const residualCents = officialCents - rounded.reduce((acc, c) => acc + c, 0);
  // Solo es diferencia de redondeo si cabe en máximo 1 centavo por línea; si no, es otra cosa y no se toca.
  if (residualCents === 0 || Math.abs(residualCents) > lines.length) return toAmounts(rounded);

  const step = residualCents > 0 ? 1 : -1;
  // Prioriza las líneas que redondearon en sentido contrario al ajuste y están más cerca de 0.5 centavos.
  const candidates = lines
    .map((line, idx) => {
      const exactCents = Number(line.rawLineTotal || 0) * 100;
      const fraction = exactCents - Math.floor(exactCents);
      const alignedWithStep = step < 0 ? fraction >= 0.5 : fraction < 0.5;
      return {
        idx,
        tier: alignedWithStep ? 0 : 1,
        distance: Math.abs(fraction - 0.5),
      };
    })
    .sort((a, b) => (a.tier - b.tier) || (a.distance - b.distance));

  const adjusted = [...rounded];
  for (let i = 0; i < Math.abs(residualCents); i += 1) {
    adjusted[candidates[i].idx] += step;
  }
  return toAmounts(adjusted);
}
