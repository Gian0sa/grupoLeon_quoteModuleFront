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
      code === "1" ||
      combined.includes("recojo tienda") ||
      combined.includes("recojo en tienda") ||
      combined.includes("recojo almacen") ||
      combined.includes("recojo almacén") ||
      combined.includes("recoge en tienda") ||
      (combined.includes("recojo") && !combined.includes("interprovincial") && !combined.includes("transporte") && !combined.includes("carga"))
    );
  }
  const str = String(parsed).toLowerCase();
  return (
    str === "1" ||
    str.includes("recojo tienda") ||
    str.includes("recojo en tienda") ||
    str.includes("recojo almacen") ||
    str.includes("recojo almacén") ||
    str.includes("recoge en tienda") ||
    (str.includes("recojo") && !str.includes("interprovincial") && !str.includes("transporte") && !str.includes("carga"))
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
    const isAgency = combined.includes("interprovincial") || combined.includes("ag. de transporte") || combined.includes("agencia") || combined.includes("carga terrestre") || code === "5" || code === "6" || code === "7" || code === "9";
    if (isAgency) return false;
    return (
      code === "2" ||
      code === "3" ||
      combined.includes("reparto propio") ||
      combined.includes("motorizado propio") ||
      (combined.includes("propio") && !combined.includes("interprovincial"))
    );
  }
  const str = String(parsed).toLowerCase();
  const isAgencyStr = str.includes("interprovincial") || str.includes("ag. de transporte") || str.includes("agencia") || str.includes("carga terrestre") || str === "5" || str === "6" || str === "7" || str === "9";
  if (isAgencyStr) return false;
  return (
    str === "2" ||
    str === "3" ||
    str.includes("reparto propio") ||
    str.includes("motorizado propio") ||
    (str.includes("propio") && !str.includes("interprovincial"))
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
  const SAP_SHIPPING_NAMES = {
    1: "04. Recojo Tienda - Almacen",
    2: "05. Reparto Propio - Programación",
    3: "06. Envio Motorizado Propio",
    4: "07. Courier Local",
    5: "02. Transporte Interprovincial",
    6: "03. Servicio de Ag. de Transporte",
    7: "01. Transporte Carga Terrestre",
    8: "08. Contraentrega COD",
    9: "09. Transporte Carga Aéreo",
  };
  if (typeof parsed === "object" && parsed !== null) {
    const name = parsed.TrnspName || parsed.label || parsed.name || "";
    if (name && /cotizaci[oó]n|oferta|pedido|boleta|factura/i.test(name.trim())) {
      return "Despacho Regular";
    }
    if (name && name !== "undefined" && name !== "null") return name;
    const code = Number(parsed.TrnspCode || parsed.code || parsed.value);
    if (SAP_SHIPPING_NAMES[code]) return SAP_SHIPPING_NAMES[code];
    if (code) return `Forma #${code}`;
  }
  const str = String(parsed).trim();
  if (/cotizaci[oó]n|oferta|pedido|boleta|factura/i.test(str)) {
    return "Despacho Regular";
  }
  const numStr = Number(str);
  if (SAP_SHIPPING_NAMES[numStr]) return SAP_SHIPPING_NAMES[numStr];
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

export const PERU_DEPARTMENT_NAMES = {
  "01": "AMAZONAS",
  "02": "ÁNCASH",
  "03": "APURÍMAC",
  "04": "AREQUIPA",
  "05": "AYACUCHO",
  "06": "CAJAMARCA",
  "07": "CALLAO",
  "08": "CUSCO",
  "09": "HUANCAVELICA",
  "10": "HUÁNUCO",
  "11": "ICA",
  "12": "JUNÍN",
  "13": "LA LIBERTAD",
  "14": "LAMBAYEQUE",
  "15": "LIMA",
  "16": "LORETO",
  "17": "MADRE DE DIOS",
  "18": "MOQUEGUA",
  "19": "PASCO",
  "20": "PIURA",
  "21": "PUNO",
  "22": "SAN MARTÍN",
  "23": "TACNA",
  "24": "TUMBES",
  "25": "UCAYALI",
};

const normalizeGeoToken = (val) =>
  String(val || "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

export const resolvePeruDepartmentName = (stateVal) => {
  if (stateVal === null || stateVal === undefined) return "";
  const raw = String(stateVal).trim();
  if (!raw) return "";
  const padded = /^\d+$/.test(raw) ? raw.padStart(2, "0") : raw;
  if (PERU_DEPARTMENT_NAMES[padded]) return PERU_DEPARTMENT_NAMES[padded];
  return raw.toUpperCase();
};

/**
 * Construye la dirección completa de un cliente o punto SAP incluyendo:
 * Calle/Dirección + Distrito (County) + Provincia (City) + Departamento (State/BillToState).
 * Nunca modifica el campo crudo `Address` usado para enviar `BillToStreet`/`ShipToStreet` a SAP.
 */
export const formatClientFullAddress = (clientOrAddr, fallbackAddress = "") => {
  if (!clientOrAddr || typeof clientOrAddr !== "object") {
    return String(fallbackAddress || "").trim();
  }

  const raw =
    clientOrAddr.raw && typeof clientOrAddr.raw === "object"
      ? clientOrAddr.raw
      : clientOrAddr;

  const bpAddresses =
    clientOrAddr.BPAddresses ||
    clientOrAddr.bpAddresses ||
    clientOrAddr.addresses ||
    raw.BPAddresses ||
    raw.bpAddresses ||
    raw.addresses ||
    [];

  const isSingleBpAddr =
    !Array.isArray(bpAddresses) ||
    (bpAddresses.length === 0 &&
      (clientOrAddr.Street !== undefined ||
        clientOrAddr.AddressType !== undefined ||
        clientOrAddr.AddressName !== undefined));

  let fiscalEntry = null;
  if (Array.isArray(bpAddresses) && bpAddresses.length > 0 && !isSingleBpAddr) {
    const billToDefault = String(
      clientOrAddr.BillToDefault || raw.BillToDefault || clientOrAddr.BillToDef || raw.BillToDef || ""
    )
      .trim()
      .toUpperCase();

    fiscalEntry =
      bpAddresses.find(
        (a) =>
          (a.AddressType === "bo_BillTo" || a.AdresType === "B") &&
          (!billToDefault || String(a.AddressName || a.Address || "").trim().toUpperCase() === billToDefault)
      ) ||
      bpAddresses.find((a) => a.AddressType === "bo_BillTo" || a.AdresType === "B") ||
      bpAddresses.find((a) => String(a.AddressName || a.Address || "").trim().toUpperCase() === "FISCAL") ||
      bpAddresses[0];
  }

  const street = String(
    clientOrAddr.Street ||
      fiscalEntry?.Street ||
      clientOrAddr.Address ||
      clientOrAddr.address ||
      clientOrAddr.clientAddress ||
      raw.Address ||
      raw.address ||
      fallbackAddress ||
      ""
  ).trim();

  const block = String(
    clientOrAddr.Block || fiscalEntry?.Block || raw.Block || ""
  ).trim();

  const county = String(
    clientOrAddr.County ||
      clientOrAddr.county ||
      clientOrAddr.district ||
      clientOrAddr.District ||
      fiscalEntry?.County ||
      raw.County ||
      clientOrAddr.MailCounty ||
      raw.MailCounty ||
      ""
  ).trim();

  const city = String(
    clientOrAddr.City ||
      clientOrAddr.city ||
      clientOrAddr.province ||
      clientOrAddr.Province ||
      fiscalEntry?.City ||
      raw.City ||
      clientOrAddr.MailCity ||
      raw.MailCity ||
      ""
  ).trim();

  const stateCodeOrName =
    clientOrAddr.State ??
    clientOrAddr.state ??
    clientOrAddr.department ??
    clientOrAddr.Department ??
    fiscalEntry?.State ??
    clientOrAddr.BillToState ??
    raw.BillToState ??
    clientOrAddr.State1 ??
    raw.State1 ??
    clientOrAddr.ShipToState ??
    raw.ShipToState ??
    "";

  const department = resolvePeruDepartmentName(stateCodeOrName);

  const geoParts = [];
  const seenGeo = new Set();
  for (const part of [block, county, city, department]) {
    if (!part) continue;
    const norm = normalizeGeoToken(part);
    if (!norm || seenGeo.has(norm)) continue;
    seenGeo.add(norm);
    geoParts.push(part.toUpperCase());
  }

  if (!street) return geoParts.join(" - ");
  if (geoParts.length === 0) return street;

  const geoSuffix = geoParts.join(" - ");
  const normStreet = normalizeGeoToken(street);
  const normSuffix = normalizeGeoToken(geoSuffix);
  if (normSuffix && normStreet.endsWith(normSuffix)) {
    return street;
  }

  return `${street} — ${geoSuffix}`;
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
    const fullStreet = formatClientFullAddress(parsed, street) || street;
    let name = parsed.AddressName || parsed.name || "";
    if (name.toUpperCase() === "DESTINO NUEVO" || name.toUpperCase() === "NUEVO DESTINO") {
      name = parsed.City || parsed.County || "";
    }
    if (fullStreet && name && fullStreet !== name) {
      return `${name} - ${fullStreet}`;
    }
    return fullStreet || name || clientAddress || "Dirección Principal";
  }

  const str = String(parsed).trim();
  if (!str || str === "undefined" || str === "null") {
    return clientAddress || "Dirección Principal";
  }
  return str;
};

export const FREE_TRANSFER_PAYMENT_TYPE = {
  GroupNum: 96,
  GroupNumber: 96,
  PymntGroup: "10) TRANSFERENCIA GRATUITA",
  PaymentTermsGroupName: "10) TRANSFERENCIA GRATUITA",
  value: "96",
  label: "10) TRANSFERENCIA GRATUITA",
};

export const DEFAULT_FREE_TRANSFER_DELIVERY_FORM = {
  TrnspCode: 1,
  Code: "1",
  TrnspName: "04. Recojo Tienda - Almacen",
  Name: "04. Recojo Tienda - Almacen",
  value: "1",
  label: "04. Recojo Tienda - Almacen",
};

export const isFreeTransferPaymentType = (paymentType) => {
  if (paymentType === null || paymentType === undefined || paymentType === "") return false;
  let parsed = paymentType;
  if (typeof paymentType === "string") {
    const trimmed = paymentType.trim();
    if (!trimmed) return false;
    if (trimmed.startsWith("{")) {
      try {
        parsed = JSON.parse(trimmed);
      } catch (e) {}
    } else {
      if (trimmed === "96") return true;
      return trimmed.toLowerCase().includes("transferencia gratuita");
    }
  }
  if (typeof paymentType === "number") {
    return paymentType === 96;
  }
  if (typeof parsed === "object" && parsed !== null) {
    const code = Number(parsed.GroupNum ?? parsed.GroupNumber ?? parsed.value);
    if (code === 96) return true;
    const label = String(
      parsed.PymntGroup || parsed.PaymentTermsGroupName || parsed.label || parsed.name || ""
    ).toLowerCase();
    return label.includes("transferencia gratuita");
  }
  return false;
};

export const formatPaymentTerms = (paymentType, saleCondition) => {
  if (isFreeTransferPaymentType(paymentType)) {
    return "10) TRANSFERENCIA GRATUITA";
  }
  const extractString = (val) => {
    if (val === null || val === undefined) return "";
    if (typeof val === "number") {
      if (val === -1) return "Contado / Entrega";
      if (val === 1) return "Crédito 15 Días";
      if (val === 2) return "Crédito 30 Días";
      if (val === 3) return "Crédito 45 Días";
      if (val === 4) return "Crédito 60 Días";
      if (val === 96) return "10) TRANSFERENCIA GRATUITA";
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
        if (num === 96) return "10) TRANSFERENCIA GRATUITA";
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

export const SALES_PERSONS_MAP = {
  1: { code: 1, prefix: "062", name: "Gerardo Phun" },
  2: { code: 2, prefix: "432", name: "Carlos Paz" },
  3: { code: 3, prefix: "535", name: "Wilson Ramirez" },
  4: { code: 4, prefix: "005", name: "Guillermo Alcas" },
  5: { code: 5, prefix: "439", name: "Rene Villanueva" },
  6: { code: 6, prefix: "552", name: "Richard Talavera" },
  7: { code: 7, prefix: "541", name: "Manuel Zapata" },
  8: { code: 8, prefix: "520", name: "Benny Borja" },
  9: { code: 9, prefix: "540", name: "Eric Acuña" },
  10: { code: 10, prefix: "032", name: "Alberto Chamorro" },
  11: { code: 11, prefix: "548", name: "Daniel Capuñay" },
  12: { code: 12, prefix: "711", name: "Manuel Villalta" },
  13: { code: 13, prefix: "727", name: "Pedro Pazos" },
  14: { code: 14, prefix: "417", name: "Gleen Rodriguez" },
  15: { code: 15, prefix: "723", name: "Arturo Jeri" },
  16: { code: 16, prefix: "725", name: "Luis Perez" },
  19: { code: 19, prefix: "719", name: "Rafael Nolasco" },
  20: { code: 20, prefix: "001", name: "Ofic Administración" },
  21: { code: 21, prefix: "551", name: "León Autos" },
  30: { code: 30, prefix: "", name: "Eder Vargas" },
  31: { code: 31, prefix: "", name: "Luis Espinar" },
  33: { code: 33, prefix: "", name: "Julio Flores" },
  34: { code: 34, prefix: "", name: "Willy Ambrosio" },
  35: { code: 35, prefix: "", name: "Josepham Ruiz" },
  40: { code: 40, prefix: "", name: "Roger Vasquez" },
  41: { code: 41, prefix: "", name: "Sara Benavides" },
  42: { code: 42, prefix: "", name: "Jaime Flores" },
  43: { code: 43, prefix: "", name: "Ronald Lavado" },
  46: { code: 46, prefix: "741", name: "Yordy Sosa" },
  744: { code: 744, prefix: "", name: "usuario asdtest cambio" },
};

export const cleanSellerName = (seller) => {
  if (!seller) return "001.Ofic Administración";
  const s = String(seller).trim();
  const upper = s.toUpperCase();
  if (
    upper.includes("NINGÚN EMPLEADO") ||
    upper.includes("NINGUN EMPLEADO") ||
    upper.includes("NO ASIGNADO") ||
    upper === "-1" ||
    upper === "0" ||
    upper === "NULL" ||
    upper === "UNDEFINED" ||
    upper === "VENDEDOR AUTORIZADO" ||
    upper === "VENDEDOR" ||
    upper === "VENDEDOR SAP" ||
    upper === "SIN VENDEDOR"
  ) {
    return "001.Ofic Administración";
  }
  return s;
};

export const formatQuoteSellerName = (q, sellersList = []) => {
  if (!q) return "001.Ofic Administración";
  if (typeof q === "string") return cleanSellerName(q);

  // 1. Extraer código de vendedor numérico (SlpCode, salesPersonCode, salesEmployeeCode)
  const rawCode =
    q.SlpCode ??
    q.slpCode ??
    q.salesPersonCode ??
    q.SalesPersonCode ??
    q.salesEmployeeCode ??
    q.SalesEmployeeCode ??
    q.sellerCode ??
    q.totals?.SlpCode ??
    q.totals?.slpCode ??
    q.totals?.salesPersonCode ??
    q.totals?.salesEmployeeCode;

  const numCode = rawCode !== null && rawCode !== undefined && !isNaN(Number(rawCode)) ? Number(rawCode) : null;

  // Si tiene código 20 (Oficina / Admin)
  if (numCode === 20) {
    return "001.Ofic Administración";
  }

  // Buscar por código en sellersList de SAP
  if (numCode && numCode > 0 && Array.isArray(sellersList) && sellersList.length > 0) {
    const found = sellersList.find(s => Number(s.SalesEmployeeCode ?? s.value ?? s.code) === numCode);
    if (found?.label || found?.SalesEmployeeName) {
      return cleanSellerName(found.label || found.SalesEmployeeName);
    }
  }

  // Buscar por código en SALES_PERSONS_MAP estático
  if (numCode && numCode > 0 && SALES_PERSONS_MAP[numCode]) {
    const sp = SALES_PERSONS_MAP[numCode];
    return sp.prefix ? `${sp.prefix}.${sp.name}` : sp.name;
  }

  // 2. Extraer nombre directo si no es genérico
  const directName = String(q.sellerName || q.SlpName || q.salesPersonName || "").trim();
  const isGeneric = !directName ||
    /^(vendedor\s*autorizado|vendedor\s*sap|vendedor|sin\s*vendedor|no\s*asignado|ning[uú]n\s*empleado)$/i.test(directName);

  if (directName && !isGeneric) {
    return cleanSellerName(directName);
  }

  // 3. Buscar por creador (createdByUsername)
  const creator = String(q.createdByUsername || q.user?.username || q.user || "").trim();
  if (creator && !/^(vendedor|admin|root|null|undefined)$/i.test(creator)) {
    if (Array.isArray(sellersList) && sellersList.length > 0) {
      const cleanCreator = creator.toLowerCase();
      const found = sellersList.find(s => {
        const sName = String(s.label || s.SalesEmployeeName || "").toLowerCase();
        return sName.includes(cleanCreator) || cleanCreator.includes(sName);
      });
      if (found?.label || found?.SalesEmployeeName) {
        return cleanSellerName(found.label || found.SalesEmployeeName);
      }
    }
    return cleanSellerName(creator);
  }

  // 4. Si el cliente tiene vendedor asignado en la entidad cliente
  if (q.client?.SlpCode || q.client?.SalesPersonCode) {
    const cSlp = Number(q.client.SlpCode || q.client.SalesPersonCode);
    if (cSlp === 20) return "001.Ofic Administración";
    if (cSlp && SALES_PERSONS_MAP[cSlp]) {
      const sp = SALES_PERSONS_MAP[cSlp];
      return sp.prefix ? `${sp.prefix}.${sp.name}` : sp.name;
    }
  }

  // 5. Fallback oficial Autopartes
  return "001.Ofic Administración";
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

/**
 * Obtiene la fecha actual en la zona horaria oficial del negocio (Perú: America/Lima, UTC-5)
 * en formato YYYY-MM-DD.
 */
export const getTodayPeruDateString = () => {
  try {
    return new Date().toLocaleDateString("en-CA", { timeZone: "America/Lima" });
  } catch {
    return new Date().toISOString().split("T")[0];
  }
};

/**
 * Obtiene la fecha representativa de un documento o cotización en formato YYYY-MM-DD
 * respetando la zona horaria de Perú si viene como ISO timestamp.
 */
export const getQuoteDateString = (q) => {
  if (!q) return "";
  const rawDate = q.docDate || q.DocDate || q.createdAt || q.updatedAt || "";
  if (!rawDate) return "";
  const str = String(rawDate).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }
  try {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
    }
  } catch {}
  return str.split("T")[0] || "";
};

/**
 * Suma o resta días a una fecha en formato YYYY-MM-DD de forma exacta,
 * manejando automáticamente meses de 31, 30, 28/29 días y años bisiestos.
 */
export const addDaysToDateString = (dateStr, days) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  dt.setUTCDate(dt.getUTCDate() + days);
  const year = dt.getUTCFullYear();
  const month = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const day = String(dt.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Formatea una fecha YYYY-MM-DD para visualización ejecutiva en español (Perú)
 * Ej: "Lun, 19 oct 2026"
 */
export const formatDateDisplayPeru = (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr || "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
    return dt.toLocaleDateString("es-PE", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return dateStr;
  }
};
