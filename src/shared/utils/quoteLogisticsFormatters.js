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
    if (name && name !== "undefined" && name !== "null") return name;
    const code = parsed.TrnspCode || parsed.code || parsed.value;
    if (code === 1 || code === "1") return "Recojo en Almacén / Tienda";
    if (code === 2 || code === "2") return "Envío a Domicilio / Agencia Lima";
    if (code === 3 || code === "3") return "Despacho a Provincia (Agencia)";
    if (code) return `Forma #${code}`;
  }
  const str = String(parsed).trim();
  if (str === "1") return "Recojo en Almacén / Tienda";
  if (str === "2") return "Envío a Domicilio / Agencia Lima";
  if (str === "3") return "Despacho a Provincia (Agencia)";
  if (!str || str === "undefined" || str === "null") return "Despacho Regular";
  return str;
};

export const formatTransportName = (transport, deliveryForm) => {
  if (isPickupInStoreForm(deliveryForm)) {
    return "No aplica (Recojo en Tienda)";
  }

  if (!transport) return "Sin asignar / Por coordinar";

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
    const codePrefix = code && !name.includes(code) ? `Cód. ${code} - ` : "";
    const dir = parsed.U_TQC_DIREC ? ` (${parsed.U_TQC_DIREC})` : "";
    if (name && name !== "undefined" && name !== "null") {
      return `${codePrefix}${name}${dir}`.trim();
    }
    if (code) return `Transporte Cód. ${code}`;
  }

  const str = String(parsed).trim();
  if (!str || str === "undefined" || str === "null" || str === "null - null") {
    return "Sin asignar / Por coordinar";
  }
  return str;
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
    if (!val) return "";
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed === "[object Object]" || trimmed === "undefined" || trimmed === "null") return "";
      if (trimmed.startsWith("{")) {
        try {
          return extractString(JSON.parse(trimmed));
        } catch (e) {
          return "";
        }
      }
      return trimmed;
    }
    if (typeof val === "object" && val !== null) {
      const candidates = [
        val.PymntGroup,
        val.PaymentTermsGroupName,
        val.label,
        val.name,
        val.text,
        val.PymntGroupGroup,
        val.value
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

export const formatBankAccount = (bankAccount) => {
  if (!bankAccount) return "Pendiente de Selección";

  let parsed = bankAccount;
  if (typeof bankAccount === "string") {
    const trimmed = bankAccount.trim();
    if (trimmed.startsWith("{")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {}
    }
  }

  if (typeof parsed === "object" && parsed !== null) {
    const name = parsed.label || parsed.name || parsed.AccountName || parsed.BankCode || parsed.value || "";
    if (name) return name;
  }

  const str = String(parsed).trim();
  const normalized = str.toUpperCase();

  if (normalized === "BCP_SOLES" || normalized.includes("191-0104153-0-60")) {
    return "BCP (Soles) - Cta: 191-0104153-0-60";
  }
  if (normalized === "BCP_DOLARES" || normalized.includes("191-0104153-1-61")) {
    return "BCP (Dólares) - Cta: 191-0104153-1-61";
  }
  if (normalized === "BBVA_SOLES" || normalized.includes("0011-0175-0100041641")) {
    return "BBVA (Soles) - Cta: 0011-0175-0100041641";
  }
  if (normalized === "INTERBANK_SOLES") {
    return "Interbank (Soles)";
  }

  return str;
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
