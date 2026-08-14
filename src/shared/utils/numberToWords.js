// Convertidor de números a letras en español para comprobantes de pago (SUNAT Perú)
export function numberToWords(amount, currency = "USD") {
  if (isNaN(amount) || amount === null || amount === undefined) return "";
  
  const num = Math.abs(Number(amount));
  const integerPart = Math.floor(num);
  const decimalPart = Math.round((num - integerPart) * 100);
  const decimalStr = decimalPart < 10 ? `0${decimalPart}` : `${decimalPart}`;

  const unidades = ["", "UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
  const decenas = ["", "DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCOENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
  const especiales = {
    11: "ONCE", 12: "DOCE", 13: "TRECE", 14: "CATORCE", 15: "QUINCE",
    16: "DIECISEIS", 17: "DIECISIETE", 18: "DIECIOCHO", 19: "DIECINUEVE",
    21: "VEINTIUNO", 22: "VEINTIDOS", 23: "VEINTITRES", 24: "VEINTICUATRO",
    25: "VEINTICINCO", 26: "VEINTISEIS", 27: "VEINTISIETE", 28: "VEINTIOCHO", 29: "VEINTINUEVE"
  };
  const centenaList = ["", "CIENTO", "DOSCIENTOS", "TRESCIENTOS", "CUATROCIENTOS", "QUINIENTOS", "SEISCIENTOS", "SETECIENTOS", "OCHO CIENTOS", "NOVECIENTOS"];

  function convertGroup(n) {
    if (n === 0) return "";
    if (n === 100) return "CIEN";
    
    let str = "";
    const c = Math.floor(n / 100);
    const r = n % 100;
    
    if (c > 0) str += centenaList[c] + " ";
    
    if (r > 0) {
      if (especiales[r]) {
        str += especiales[r];
      } else {
        const d = Math.floor(r / 10);
        const u = r % 10;
        if (d > 0) {
          str += decenas[d];
          if (u > 0) str += " Y " + unidades[u];
        } else if (u > 0) {
          str += unidades[u];
        }
      }
    }
    return str.trim();
  }

  function convertNumber(n) {
    if (n === 0) return "CERO";
    
    let miles = Math.floor(n / 1000);
    let resto = n % 1000;
    let str = "";

    if (miles > 0) {
      if (miles === 1) {
        str += "MIL ";
      } else {
        str += convertGroup(miles) + " MIL ";
      }
    }
    
    if (resto > 0) {
      str += convertGroup(resto);
    }
    
    return str.trim();
  }

  const resultWords = convertNumber(integerPart);
  const currencyLabel = currency === "PEN" || currency === "SOLES" ? "SOLES" : "DÓLARES AMERICANOS";

  return `SON: ${resultWords} Y ${decimalStr}/100 ${currencyLabel}`;
}
