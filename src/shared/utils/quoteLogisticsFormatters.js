/**
 * Utilidades centrales para formateo y parseo limpio de Logística, Despacho y Finanzas
 * Evita la visualización de JSON crudo {"TrnspCode"...} y textos fijos quemados.
 */

export const isPickupInStoreForm = (form) => {
  if (!form) return false;
  let parsed = form;
  if (typeof form === "string") {
    const trimmed = form.trim();
    if (trimmed.startsWith("{")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {}
    }
  }
  if (typeof parsed === "object" && parsed !== null) {
    const code = String(parsed.TrnspCode ?? parsed.code ?? parsed.value ?? "");
    const name = String(parsed.TrnspName ?? parsed.name ?? parsed.label ?? "");
    const combined = `${code} ${name}`.toLowerCase();
    return (
      combined.includes("recojo") ||
      combined.includes("tienda") ||
      combined.includes("almacen") ||
      combined.includes("almacén") ||
      combined.includes("recoge") ||
      code === "1" ||
      code === "4" ||
      code === "04"
    );
  }
  const str = String(parsed).toLowerCase();
  return (
    str.includes("recojo") ||
    str.includes("tienda") ||
    str.includes("almacen") ||
    str.includes("almacén") ||
    str.includes("recoge") ||
    str === "1" ||
    str === "4" ||
    str === "04"
  );
};

export const isOwnDeliveryForm = (form) => {
  if (!form) return false;
  let parsed = form;
  if (typeof form === "string") {
    const trimmed = form.trim();
    if (trimmed.startsWith("{")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {}
    }
  }
  if (typeof parsed === "object" && parsed !== null) {
    const code = String(parsed.TrnspCode ?? parsed.code ?? parsed.value ?? "");
    const name = String(parsed.TrnspName ?? parsed.name ?? parsed.label ?? "");
    const combined = `${code} ${name}`.toLowerCase();
    return (
      combined.includes("reparto propio") ||
      combined.includes("propio") ||
      combined.includes("movilidad propia") ||
      combined.includes("movilidad interna") ||
      code === "2" ||
      code === "02" ||
      code === "5" ||
      code === "05"
    );
  }
  const str = String(parsed).toLowerCase();
  return (
    str.includes("reparto propio") ||
    str.includes("propio") ||
    str.includes("movilidad propia") ||
    str.includes("movilidad interna") ||
    str === "2" ||
    str === "02" ||
    str === "5" ||
    str === "05"
  );
};

export const formatDeliveryForm = (form) => {
  if (!form) return "Despacho Regular";
  let parsed = form;
  if (typeof form === "string") {
    const trimmed = form.trim();
    if (trimmed.startsWith("{")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {}
    }
  }
  if (typeof parsed === "object" && parsed !== null) {
    const name = parsed.TrnspName || parsed.label || parsed.name || "";
    if (name && /cotizaci[oó]n|oferta|pedido|boleta|factura/i.test(name.trim())) {
      return "Despacho Regular";
    }
    if (name && name !== "undefined" && name !== "null") return name;
    const code = parsed.TrnspCode || parsed.code || parsed.value;
    if (code === 1 || code === "1") return "Recojo en Almacén / Tienda";
    if (code === 2 || code === "2") return "Envío a Domicilio / Agencia Lima";
    if (code === 3 || code === "3") return "Despacho a Provincia (Agencia)";
    if (code) return `Forma #${code}`;
  }
  const str = String(parsed).trim();
  if (/cotizaci[oó]n|oferta|pedido|boleta|factura/i.test(str)) {
    return "Despacho Regular";
  }
  if (str === "1") return "Recojo en Almacén / Tienda";
  if (str === "2") return "Envío a Domicilio / Agencia Lima";
  if (str === "3") return "Despacho a Provincia (Agencia)";
  if (!str || str === "undefined" || str === "null") return "Despacho Regular";
  return str;
};

export const formatTransportName = (transport, deliveryForm, options = {}) => {
  const { includeAddress = false, includeCode = false } = typeof options === "boolean" ? { includeAddress: options } : options;

  let parsed = transport;
  if (typeof transport === "string") {
    const trimmed = transport.trim();
    if (trimmed.startsWith("{")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {}
    }
  }

  if (typeof parsed === "object" && parsed !== null) {
    const name = parsed.Name || parsed.label || parsed.name || parsed.TrnspName || parsed.value || "";
    const code = parsed.Code || parsed.code || parsed.TrnspCode ? String(parsed.Code || parsed.code || parsed.TrnspCode).replace(/^0+/, "") : "";
    const codePrefix = includeCode && code && !name.includes(code) && !name.toLowerCase().startsWith("cód") ? `Cód. ${code} - ` : "";
    const dir = includeAddress && parsed.U_TQC_DIREC ? ` (${parsed.U_TQC_DIREC})` : "";
    if (name && name !== "undefined" && name !== "null" && !name.toLowerCase().includes("no aplica")) {
      if (name.toUpperCase().includes("AUTOPARTES")) {
        return "AUTOPARTES S.A. (Reparto Propio)";
      }
      return `${codePrefix}${name}${dir}`.trim();
    }
    if (code) return `Transporte Cód. ${code}`;
  }

  const str = String(parsed || "").trim();
  if (str && str !== "undefined" && str !== "null" && str !== "null - null" && !str.toLowerCase().includes("no aplica")) {
    if (str.toUpperCase().includes("AUTOPARTES")) {
      return "AUTOPARTES S.A. (Reparto Propio)";
    }
    return str;
  }

  if (isOwnDeliveryForm(deliveryForm) || str.toLowerCase().includes("reparto propio") || str.toLowerCase().includes("propio")) {
    return "AUTOPARTES S.A. (Reparto Propio)";
  }
  if (isPickupInStoreForm(deliveryForm) || str.toLowerCase().includes("recojo") || str.toLowerCase().includes("tienda")) {
    return "CLIENTE (Recojo en Tienda)";
  }

  return "Sin asignar / Por coordinar";
};

export const formatTransportAddress = (transport, deliveryForm, fallbackAddress = "-") => {
  // En Reparto Propio o Recojo en Tienda NO existe agencia de transporte externa en Lima a donde enviar la carga.
  if (isOwnDeliveryForm(deliveryForm) || isPickupInStoreForm(deliveryForm)) {
    return "-";
  }

  let parsed = transport;
  if (typeof transport === "string") {
    const trimmed = transport.trim();
    if (trimmed.startsWith("{")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {}
    }
  }

  if (typeof parsed === "object" && parsed !== null) {
    const code = String(parsed.Code || parsed.code || parsed.TrnspCode || "").replace(/^0+/, "");
    const name = String(parsed.Name || parsed.name || parsed.label || "").toUpperCase();
    // Si el transportista es Autopartes S.A. o Cliente, la dirección de agencia no aplica (-)
    if (code === "53" || name.includes("AUTOPARTES") || name.includes("REPARTO PROPIO") || name.includes("RECOJO")) {
      return "-";
    }
    if (parsed.U_TQC_DIREC && parsed.U_TQC_DIREC !== "undefined" && parsed.U_TQC_DIREC !== "null" && parsed.U_TQC_DIREC !== "-") {
      return parsed.U_TQC_DIREC;
    }
    if (parsed.address && parsed.address !== "undefined" && parsed.address !== "null" && parsed.address !== "-") {
      return parsed.address;
    }
  }

  const str = String(parsed || "").toLowerCase();
  if (str.includes("reparto propio") || str.includes("propio") || str.includes("autopartes") || str.includes("recojo") || str.includes("tienda")) {
    return "-";
  }

  if (fallbackAddress && fallbackAddress !== "undefined" && fallbackAddress !== "null" && fallbackAddress !== "-") {
    const fbLower = String(fallbackAddress).toLowerCase();
    if (fbLower.includes("aurora") || fbLower.includes("las torres") || fbLower.includes("autopartes")) {
      return "-";
    }
    return fallbackAddress;
  }
  return "-";
};

export const formatDeliveryPoint = (point, clientAddress) => {
  if (!point) return clientAddress || "Dirección Principal";

  let parsed = point;
  if (typeof point === "string") {
    const trimmed = point.trim();
    if (trimmed.startsWith("{")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {}
    }
  }

  if (typeof parsed === "object" && parsed !== null) {
    const street = parsed.Street || parsed.address || parsed.label || "";
    const name = parsed.AddressName || parsed.name || "";
    if (street && name && street !== name) {
      return `${name} - ${street}`;
    }
    return street || name || clientAddress || "Dirección Principal";
  }

  const str = String(parsed).trim();
  if (!str || str === "undefined" || str === "null") {
    return clientAddress || "Dirección Principal";
  }
  return str;
};

export const formatPaymentTerms = (paymentType, saleCondition) => {
  const extractString = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "number") {
      if (val === -1) return "Contado / Entrega";
      if (val === 1) return "Crédito 15 Días";
      if (val === 2) return "Crédito 30 Días";
      if (val === 3) return "Crédito 45 Días";
      if (val === 4) return "Crédito 60 Días";
      return `Término de Pago (${val})`;
    }
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed === "[object Object]" || trimmed === "undefined" || trimmed === "null" || !trimmed) return "";
      if (trimmed.startsWith("{")) {
        try {
          return extractString(JSON.parse(trimmed));
        } catch (e) {
          return "";
        }
      }
      if (/^-?\d+$/.test(trimmed)) {
        const num = Number(trimmed);
        if (num === -1) return "Contado / Entrega";
        if (num === 1) return "Crédito 15 Días";
        if (num === 2) return "Crédito 30 Días";
        if (num === 3) return "Crédito 45 Días";
        if (num === 4) return "Crédito 60 Días";
      }
      return trimmed;
    }
    if (typeof val === "object" && val !== null) {
      const candidates = [
        val.PaymentTermsGroupName,
        val.PymntGroup,
        val.label,
        val.name,
        val.text,
        val.PymntGroupGroup,
        val.value,
        val.GroupNumber,
        val.GroupNum
      ];
      for (const cand of candidates) {
        const res = extractString(cand);
        if (res && res !== "[object Object]") return res;
      }
    }
    return "";
  };

  const paymentStr = extractString(paymentType);
  if (paymentStr) return paymentStr;

  const saleStr = extractString(saleCondition);
  if (saleStr) return saleStr;

  return "Contado / Entrega";
};

export const formatSunatOp = (sunatOp) => {
  if (!sunatOp) return "0101 - Venta Interna (General / Op. Onerosa)";
  const str = String(sunatOp).trim();
  if (str === "0101") return "0101 - Venta Interna (General)";
  if (str === "0102") return "0102 - Exportación";
  if (str === "0200") return "0200 - Operación Gratuita";
  return str;
};

export const cleanSellerName = (seller) => {
  if (!seller) return "Vendedor Autorizado";
  const s = String(seller).trim();
  const upper = s.toUpperCase();
  if (
    upper.includes("NINGÚN EMPLEADO") ||
    upper.includes("NINGUN EMPLEADO") ||
    upper.includes("NO ASIGNADO") ||
    upper === "-1" ||
    upper === "0" ||
    upper === "NULL" ||
    upper === "UNDEFINED"
  ) {
    return "Venta Directa / Mostrador";
  }
  return s;
};

export const cleanClientName = (q) => {
  if (!q) return "Cliente General";
  if (typeof q === "string") {
    const s = q.trim();
    if (s.toUpperCase() === "CLIENTE CLIENTE CLIENTE" || s.toUpperCase() === "CLIENTE GENERAL" || !s) {
      return "Cliente General / Mostrador";
    }
    return s;
  }
  const name = String(q.clientName || q.client?.CardName || q.CardName || q.totals?.clientName || "").trim();
  const doc = String(q.clientDocument || q.client?.CardCode || q.clientRuc || q.CardCode || "").trim();
  
  if (!name || name.toUpperCase() === "CLIENTE CLIENTE CLIENTE" || name.toUpperCase() === "CLIENTE GENERAL") {
    if (doc && doc !== "undefined" && doc !== "null") return `Cliente Registrado (${doc})`;
    return "Cliente General / Mostrador";
  }
  return name;
};

/**
 * Formateador seguro para Banco del Cheque (BCQ).
 * En una Orden de Venta o Cotización física, esta casilla corresponde exclusivamente
 * al banco emisor de un Cheque bancario. Las cuentas corrientes de recaudo de la empresa
 * corresponden a la cobranza / facturación posterior y NUNCA deben mostrarse aquí.
 */
export const formatCheckBank = (val) => {
  if (!val) return "—";
  if (typeof val !== "string") return "—";
  const clean = val.trim();
  if (
    !clean ||
    clean === "—" ||
    clean === "-" ||
    clean === "null" ||
    clean === "undefined" ||
    clean === "[object Object]"
  ) {
    return "—";
  }
  // Filtrar cuentas corrientes bancarias (ej. 191-0104153-0-50), códigos de medio o valores estáticos
  if (
    /\d{3,}-\d+/.test(clean) ||
    /\d{6,}/.test(clean) ||
    clean.includes("0104153") ||
    /^(BCP|BBVA|SCOTIA|INTERBANK)_(SOLES|USD|DOLARES)/i.test(clean) ||
    /^\d+$/.test(clean)
  ) {
    return "—";
  }
  return clean;
};
