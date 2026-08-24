/**
 * Motor de cálculo de la cotización.
 *
 * Única fuente de verdad para los importes en el frontend: ningún componente
 * debe recalcular totales por su cuenta. Todo lo que sale de aquí es una
 * *previsualización* — cuando la cotización se registra en SAP, los totales de
 * SAP son los que mandan.
 */

/** Redondea a 2 decimales evitando el error binario de coma flotante. */
export function round2(value) {
  const num = Number(value) || 0;
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/** Importe neto de una línea: cantidad x precio, con descuento en cascada (SAP + adicional). */
export function lineNet(quantity, unitPrice, discountPct = 0, addDiscountPct = 0) {
  const qty = Number(quantity) || 0;
  const price = Number(unitPrice) || 0;
  const discount1 = clampPercent(discountPct);
  const discount2 = clampPercent(addDiscountPct);

  const gross = qty * price;
  const net = gross * (1 - discount1 / 100) * (1 - discount2 / 100);
  return round2(net);
}

/** Importe bruto de una línea, sin aplicar descuento. */
export function lineGross(quantity, unitPrice) {
  return round2((Number(quantity) || 0) * (Number(unitPrice) || 0));
}

/** Descuento en dinero de una línea. */
export function lineDiscountAmount(quantity, unitPrice, discountPct = 0, addDiscountPct = 0) {
  return round2(
    lineGross(quantity, unitPrice) - lineNet(quantity, unitPrice, discountPct, addDiscountPct)
  );
}

/**
 * Suma de las líneas ya con descuento aplicado (base imponible, sin IGV).
 * @param {Array<{quantity:number, unitPrice:number, discount:number, lineDiscount?:number}>} lines
 */
export function subtotal(lines = []) {
  return round2(
    lines.reduce(
      (acc, l) => acc + lineNet(l.quantity, l.unitPrice, l.discount, l.lineDiscount || 0),
      0
    )
  );
}

/** Total de descuentos por línea, en dinero. */
export function discountTotal(lines = []) {
  return round2(
    lines.reduce(
      (acc, l) => acc + lineDiscountAmount(l.quantity, l.unitPrice, l.discount, l.lineDiscount || 0),
      0
    )
  );
}

/** IGV sobre la base imponible. `igvRate` puede venir como 0.18 o como 18. */
export function taxAmount(base, igvRate) {
  return round2((Number(base) || 0) * normalizeRate(igvRate));
}

/** Total del documento: base imponible + IGV. */
export function docTotal(base, igvRate) {
  const b = Number(base) || 0;
  return round2(b + taxAmount(b, igvRate));
}

/**
 * Calcula todos los totales de la cotización de una sola pasada.
 * @returns {{subtotal:number, discountTotal:number, taxTotal:number, docTotal:number}}
 */
export function calculateTotals(lines = [], igvRate = 0.18) {
  const base = subtotal(lines);
  const taxTotal = taxAmount(base, igvRate);

  return {
    subtotal: base,
    discountTotal: discountTotal(lines),
    taxTotal,
    docTotal: round2(base + taxTotal),
  };
}

/**
 * Convierte un importe entre USD y PEN usando el tipo de cambio indicado.
 * Se espera el tipo de cambio expresado como soles por dólar.
 */
export function convertCurrency(amount, rate, { from = 'USD', to = 'PEN' } = {}) {
  const value = Number(amount) || 0;
  const r = Number(rate) || 0;

  if (from === to) return round2(value);
  if (r <= 0) return round2(value);

  if (from === 'USD' && to === 'PEN') return round2(value * r);
  if (from === 'PEN' && to === 'USD') return round2(value / r);

  return round2(value);
}

/** Acepta 18 o 0.18 y devuelve siempre la fracción (0.18). */
function normalizeRate(rate) {
  const r = Number(rate);
  if (!r || Number.isNaN(r) || r < 0) return 0;
  return r > 1 ? r / 100 : r;
}

/** Un descuento válido está entre 0 y 100. */
function clampPercent(pct) {
  const p = Number(pct) || 0;
  return Math.min(100, Math.max(0, p));
}
