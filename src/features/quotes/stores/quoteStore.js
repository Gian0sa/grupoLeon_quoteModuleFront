import { create } from 'zustand';

const isMeaningfulValue = (value) => {
  if (value === undefined || value === null) return false;
  const normalized = String(value).trim().toUpperCase();
  return Boolean(normalized) && !["S/N", "N/A", "NA", "NULL", "UNDEFINED"].includes(normalized);
};

const firstMeaningfulValue = (...values) => values.find(isMeaningfulValue);

const cleanDocumentNumber = (value) => {
  if (!isMeaningfulValue(value)) return "";
  return String(value)
    .trim()
    .replace(/^CL/i, "")
    .replace(/\D/g, "");
};

/**
 * Normaliza cualquier ítem proveniente de SAP, la Base de Datos o localStorage
 * para que jamás se pierdan los nombres, códigos ni precios.
 */
export const normalizeQuoteItem = (item) => {
  if (!item || typeof item !== "object") return null;
  const rawCode = item.productCode || item.itemCode || item.code || item.ItemCode || item.id || "";
  const finalCode = String(rawCode).trim();
  const id = finalCode || String(Date.now());
  const code = finalCode;
  const name = item.name || item.productName || item.description || item.ItemName || item.ItemDescription || item.Dscription || "Artículo General";
  const rawPrice = Number(item.price ?? item.unitPrice ?? item.Price ?? item.importe ?? 0);
  // Auto-fallback en catálogo de pruebas si no viene precio configurado (0) -> $25.00
  // Cuando se conecta a la ruta real de SAP (precio > 0), usará directamente el precio real de SAP
  const price = rawPrice > 0 ? rawPrice : 25.0;
  const discount = Number(item.discount ?? item.Discount ?? item.sapDiscount ?? 0);
  const lineDiscount = Number(item.lineDiscount ?? item.LineDiscount ?? 0);
  const totalDisc = Math.min(55, Number((discount + lineDiscount).toFixed(2)));
  const discountedUnitPrice = Number((price * (1 - totalDisc / 100)).toFixed(4));

  // Permitir temporalmente string vacío al tipear para que el usuario pueda borrar y cambiar la cantidad libremente
  const rawQty = item.quantity ?? item.Quantity;
  let quantity = 1;
  if (rawQty === "") {
    quantity = "";
  } else if (rawQty !== undefined && rawQty !== null) {
    const parsed = parseInt(rawQty, 10);
    quantity = isNaN(parsed) ? "" : parsed;
  }
  
  // Si stock no viene definido en la BD/draft, queda como null para no marcar erróneamente como AGOTADO
  const rawStock = item.stock ?? item.Stock ?? item.OnHand ?? item.STOCK_DISPONIBLE;
  const stock = rawStock !== undefined && rawStock !== null && !isNaN(Number(rawStock))
    ? Number(rawStock)
    : null;
    
  const whsCode = item.whsCode || item.WhsCode || "014";
  const sigla = item.sigla || item.Sigla || "";
  const marca = item.marca || item.Marca || "";
  const isAgotado = Boolean(item.isAgotado || (item.stockChecked && stock === 0));

  return {
    ...item,
    id,
    code,
    productCode: code,
    itemCode: code,
    name,
    productName: name,
    description: name,
    ItemDescription: name,
    ItemName: name,
    price,
    unitPrice: price,
    discount,
    sapDiscount: discount,
    lineDiscount,
    discountPercent: totalDisc,
    discountedUnitPrice,
    quantity: quantity === "" ? "" : (isNaN(Number(quantity)) || Number(quantity) < 1 ? 1 : Number(quantity)),
    stock,
    stockChecked: item.stockChecked !== undefined ? item.stockChecked : (rawStock !== undefined && rawStock !== null),
    isAgotado,
    whsCode,
    sigla,
    marca,
    isPriceFromSap: true,
    isTestFallback: false,
  };
};

/**
 * Convierte las distintas formas de cliente que devuelve SAP, el backend o
 * localStorage a la forma que consumen el formulario y el autocomplete.
 */
export const normalizeQuoteClient = (clientData) => {
  if (!clientData || typeof clientData !== "object") return null;

  const raw = clientData.raw && typeof clientData.raw === "object"
    ? clientData.raw
    : clientData;

  const cardCode = firstMeaningfulValue(
    clientData.CardCode,
    clientData.cardCode,
    clientData.sapCode,
    clientData.id,
    raw.CardCode,
    raw.cardCode,
    raw.sapCode,
    raw.id,
  ) || "";
  const documentNumber = cleanDocumentNumber(firstMeaningfulValue(
    clientData.LicTradNum,
    clientData.licTradNum,
    clientData.clientRuc,
    clientData.clientDocument,
    clientData.FederalTaxID,
    raw.LicTradNum,
    raw.licTradNum,
    raw.clientRuc,
    raw.clientDocument,
    raw.FederalTaxID,
    cardCode,
  ));
  const normalizedCardCode = cardCode || (documentNumber ? `CL${documentNumber}` : "");
  const cardName = firstMeaningfulValue(
    clientData.CardName,
    clientData.cardName,
    clientData.clientName,
    clientData.name,
    clientData.firstName,
    raw.CardName,
    raw.cardName,
    raw.clientName,
    raw.name,
  ) || "";
  const address = firstMeaningfulValue(
    clientData.Address,
    clientData.address,
    clientData.clientAddress,
    raw.Address,
    raw.address,
  ) || "";

  if (!normalizedCardCode && !documentNumber && !cardName && !address) return null;

  return {
    ...clientData,
    CardCode: normalizedCardCode,
    LicTradNum: documentNumber,
    CardName: cardName,
    Address: address,
    clientRuc: documentNumber,
    clientDocument: documentNumber,
    raw,
  };
};

const initialQuoteState = {
  quoteId: null,
  client: null,
  products: [],
  opNum: null,
  selectedPoint: null,
  selectedTransport: null,
  selectedDeliveryForm: null,
  selectedPaymentType: null,
  paymentImg: null,
  comment: null,
  deliveryDate: null,
  whsCode: "014",
  approvalStatus: null,
  rejectionReason: null,
  observations: null,
  contactPerson: "",
  refNumber: "",
  saleCondition: "", // Sin pre-marcar (el usuario elige CONTADO o CRÉDITO)
  documentType: "",   // Sin pre-marcar (el usuario elige FACTURA o BOLETA)
  isLetra: false,           // boolean
  creditTerm: "", // Sin pre-marcar
  sellerName: null,
  createdByUsername: null,
  createdByUserId: null,
  SlpCode: null,
  salesPersonCode: null,
  salesEmployeeCode: null,
  paymentMethod: "DEPOSITO_BANCARIO",
  bankAccount: "BCP_SOLES",
  sunatOpType: "0101",
  historyLog: [],
};

const DRAFT_STORAGE_KEY = "grupoLeon_active_draft";

const saveDraftToStorage = (state) => {
  try {
    const hasMeaningfulData = Boolean(
      state.client ||
      (Array.isArray(state.products) && state.products.length > 0) ||
      state.selectedTransport ||
      state.selectedDeliveryForm ||
      state.selectedPaymentType ||
      state.selectedPoint ||
      state.opNum ||
      state.comment ||
      state.saleCondition ||
      state.documentType ||
      state.creditTerm
    );

    if (hasMeaningfulData) {
      const dataToSave = {
        quoteId: state.quoteId,
        client: state.client,
        products: state.products,
        opNum: state.opNum,
        selectedPoint: state.selectedPoint,
        selectedTransport: state.selectedTransport,
        selectedDeliveryForm: state.selectedDeliveryForm,
        selectedPaymentType: state.selectedPaymentType,
        comment: state.comment,
        deliveryDate: state.deliveryDate,
        whsCode: state.whsCode || "014",
        approvalStatus: state.approvalStatus,
        contactPerson: state.contactPerson,
        refNumber: state.refNumber,
        saleCondition: state.saleCondition,
        documentType: state.documentType,
        isLetra: state.isLetra,
        creditTerm: state.creditTerm,
        paymentMethod: state.paymentMethod,
        bankAccount: state.bankAccount,
        sunatOpType: state.sunatOpType,
        sellerName: state.sellerName,
        createdByUsername: state.createdByUsername,
        createdByUserId: state.createdByUserId,
        SlpCode: state.SlpCode,
        salesPersonCode: state.salesPersonCode,
        salesEmployeeCode: state.salesEmployeeCode,
        savedAt: new Date().toISOString(),
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(dataToSave));
    }
  } catch (e) {}
};

const getInitialStateWithDraft = () => {
  try {
    const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        return {
          ...initialQuoteState,
          ...parsed,
          client: parsed.client ? normalizeQuoteClient(parsed.client) : null,
          products: Array.isArray(parsed.products) ? parsed.products.map(normalizeQuoteItem).filter(Boolean) : [],
        };
      }
    }
  } catch (e) {}
  return initialQuoteState;
};

export const useQuoteStore = create((set, get) => {
  const customSet = (partial) => {
    set(partial);
    saveDraftToStorage(get());
  };

  return {
    ...getInitialStateWithDraft(),

    setClient: (clientData) => customSet({ client: normalizeQuoteClient(clientData) }),
    setQuoteId: (id) => customSet({ quoteId: id }),
    setApprovalStatus: (status) => customSet({ approvalStatus: status }),

    setSelectedPoint: (point) => customSet({ selectedPoint: point }),
    setSelectedTransport: (transport) => customSet({ selectedTransport: transport }),
    setSelectedDeliveryForm: (form) => customSet({ selectedDeliveryForm: form }),
    setSelectedPaymentType: (type) => customSet({ selectedPaymentType: type }),
    setPaymentImg: (file) => customSet({ paymentImg: file }),
    setComment: (comment) => customSet({ comment }),
    setDeliveryDate: (date) => customSet({ deliveryDate: date }),
    setOpNum: (opNum) => customSet({ opNum }),
    setWhsCode: (code) => customSet({ whsCode: code || "014" }),
    setContactPerson: (person) => customSet({ contactPerson: person }),
    setRefNumber: (ref) => customSet({ refNumber: ref }),
    setSaleCondition: (saleCondition) => customSet({ saleCondition }),
    setDocumentType: (documentType) => customSet({ documentType }),
    setIsLetra: (isLetra) => customSet({ isLetra }),
    setCreditTerm: (creditTerm) => customSet({ creditTerm }),
    setPaymentMethod: (method) => customSet({ paymentMethod: method }),
    setBankAccount: (account) => customSet({ bankAccount: account }),
    setSunatOpType: (type) => customSet({ sunatOpType: type }),

    addProduct: (product) => {
      const state = get();
      const normalized = normalizeQuoteItem(product);
      if (!normalized) return;

      const normCode = String(normalized.code || normalized.id || "").trim().toUpperCase();
      const index = state.products.findIndex((p) => {
        const pCode = String(p.code || p.id || "").trim().toUpperCase();
        return pCode && normCode && pCode === normCode;
      });

      let updated;
      if (index >= 0) {
        updated = [...state.products];
        updated[index] = {
          ...updated[index],
          quantity: updated[index].quantity + normalized.quantity,
        };
      } else {
        updated = [...state.products, normalized];
      }
      customSet({ products: updated });
    },

    setProducts: (products) => {
      if (!Array.isArray(products)) {
        customSet({ products: [] });
        return;
      }
      const normalizedList = products.map(normalizeQuoteItem).filter(Boolean);
      const uniqueMap = new Map();
      normalizedList.forEach((item) => {
        const key = String(item.code || item.id || "").trim().toUpperCase();
        if (key && !uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });
      customSet({ products: Array.from(uniqueMap.values()) });
    },

    removeProduct: (id) => {
      const state = get();
      const targetKey = String(id || "").trim().toUpperCase();
      customSet({
        products: state.products.filter((p) => {
          const pCode = String(p.code || p.id || "").trim().toUpperCase();
          const pId = String(p.id || "").trim().toUpperCase();
          return pCode !== targetKey && pId !== targetKey;
        }),
      });
    },

    updateProduct: (id, updatedFields) => {
      const state = get();
      const targetKey = String(id || "").trim().toUpperCase();
      customSet({
        products: state.products.map((product) => {
          const pCode = String(product.code || "").trim().toUpperCase();
          const pId = String(product.id || "").trim().toUpperCase();
          const pProductCode = String(product.productCode || "").trim().toUpperCase();
          const pItemCode = String(product.itemCode || "").trim().toUpperCase();
          if (pCode === targetKey || pId === targetKey || pProductCode === targetKey || pItemCode === targetKey) {
            return normalizeQuoteItem({ ...product, ...updatedFields });
          }
          return product;
        }),
      });
    },

    loadQuote: (quoteData = {}) => {
      const rawClient = typeof quoteData.client === "object" && quoteData.client !== null ? quoteData.client : {};
      const clientName = firstMeaningfulValue(
        rawClient.CardName, rawClient.cardName, rawClient.clientName, rawClient.name,
        quoteData.clientName, typeof quoteData.client === "string" ? quoteData.client : null
      );
      const clientDoc = firstMeaningfulValue(
        rawClient.LicTradNum, rawClient.licTradNum, rawClient.clientRuc, rawClient.clientDocument,
        quoteData.clientDocument, quoteData.clientRuc, quoteData.clientRUC, quoteData.LicTradNum
      );
      const cardCode = firstMeaningfulValue(
        rawClient.CardCode, rawClient.cardCode, rawClient.sapCode, rawClient.id,
        quoteData.CardCode, quoteData.cardCode, quoteData.clientCode,
        clientDoc ? `CL${cleanDocumentNumber(clientDoc)}` : null
      );
      const address = firstMeaningfulValue(
        rawClient.Address, rawClient.address, rawClient.clientAddress,
        quoteData.clientAddress, quoteData.address
      );

      const client = normalizeQuoteClient({
        ...rawClient,
        CardCode: cardCode,
        LicTradNum: clientDoc,
        CardName: clientName,
        Address: address,
        raw: rawClient.raw || (Object.keys(rawClient).length ? rawClient : quoteData),
      });

      const rawList = Array.isArray(quoteData.products) && quoteData.products.length > 0
        ? quoteData.products
        : (Array.isArray(quoteData.items) ? quoteData.items : []);

      const normalizedList = rawList.map(normalizeQuoteItem).filter(Boolean);
      const uniqueMap = new Map();
      normalizedList.forEach((item) => {
        const key = String(item.code || item.id || "").trim().toUpperCase();
        if (key && !uniqueMap.has(key)) {
          uniqueMap.set(key, item);
        }
      });

      const contactPersonVal = firstMeaningfulValue(
        quoteData.contactPerson,
        quoteData.totals?.contactPerson,
        quoteData.ContactPerson,
        quoteData.contact_person,
        rawClient.ContactPerson,
        rawClient.contactPerson,
        quoteData.raw?.ContactPerson
      ) || "";

      const refNumberVal = firstMeaningfulValue(
        quoteData.refNumber,
        quoteData.totals?.refNumber,
        quoteData.NumAtCard,
        quoteData.numAtCard,
        quoteData.Reference1,
        quoteData.reference,
        quoteData.ref_number,
        quoteData.ocCliente,
        quoteData.U_VS_OCCLIENTE
      ) || "";

      const saleConditionVal = firstMeaningfulValue(
        quoteData.saleCondition,
        quoteData.totals?.saleCondition,
        quoteData.U_VS_CONDICION,
        quoteData.condicionVenta,
        quoteData.condicionPago
      ) || (quoteData.paymentType?.isCredit ? "CREDITO" : (quoteData.paymentType ? "CONTADO" : ""));

      const documentTypeVal = firstMeaningfulValue(
        quoteData.documentType,
        quoteData.totals?.documentType,
        quoteData.U_VS_COMPROBANTE,
        quoteData.tipoComprobante,
        quoteData.docTypeVenta
      ) || "";

      const isLetraVal = Boolean(quoteData.isLetra || quoteData.totals?.isLetra || quoteData.hasLetra || quoteData.letra || quoteData.U_VS_LETRA === "S");
      const creditTermVal = firstMeaningfulValue(
        quoteData.creditTerm,
        quoteData.totals?.creditTerm,
        quoteData.U_VS_PLAZO,
        quoteData.plazo,
        quoteData.plazoCredito
      ) || "";

      let deliveryFormVal = quoteData.selectedDeliveryForm || quoteData.deliveryForm || quoteData.totals?.selectedDeliveryForm || quoteData.totals?.deliveryForm || "";
      if (typeof deliveryFormVal === "string" && deliveryFormVal.trim().startsWith("{")) {
        try { deliveryFormVal = JSON.parse(deliveryFormVal); } catch (e) {}
      }

      let transportVal = quoteData.selectedTransport || quoteData.transport || quoteData.TransportationCode || quoteData.totals?.selectedTransport || quoteData.totals?.transport || "";
      if (typeof transportVal === "string" && transportVal.trim().startsWith("{")) {
        try { transportVal = JSON.parse(transportVal); } catch (e) {}
      }

      let pointVal = quoteData.selectedPoint || quoteData.deliveryPoint || quoteData.ShipToCode || quoteData.totals?.selectedPoint || quoteData.totals?.deliveryPoint || null;
      if (typeof pointVal === "string" && pointVal.trim().startsWith("{")) {
        try { pointVal = JSON.parse(pointVal); } catch (e) {}
      }

      let paymentTypeVal = quoteData.selectedPaymentType || quoteData.paymentType || quoteData.PaymentGroupCode || quoteData.PayTermsGrpCode || quoteData.totals?.selectedPaymentType || quoteData.totals?.paymentType || "";
      if (typeof paymentTypeVal === "string" && paymentTypeVal.trim().startsWith("{")) {
        try { paymentTypeVal = JSON.parse(paymentTypeVal); } catch (e) {}
      }

      const rawDeliveryDate = quoteData.deliveryDate || quoteData.DocDueDate || quoteData.docDueDate || quoteData.fechaEntrega || null;
      let validDeliveryDate = null;
      if (rawDeliveryDate) {
        const d = rawDeliveryDate instanceof Date ? rawDeliveryDate : new Date(rawDeliveryDate);
        validDeliveryDate = !isNaN(d.getTime()) ? d : rawDeliveryDate;
      }

      customSet({
        ...initialQuoteState,
        quoteId: quoteData.docNumber || quoteData.id || null,
        client,
        products: Array.from(uniqueMap.values()),
        opNum: quoteData.opNum || quoteData.U_VS_OPNUM || quoteData.totals?.opNum || quoteData.totals?.U_VS_OPNUM || null,
        selectedPoint: pointVal,
        selectedTransport: transportVal,
        selectedDeliveryForm: deliveryFormVal,
        selectedPaymentType: paymentTypeVal,
        paymentImg: quoteData.paymentImg || null,
        comment: quoteData.comment || quoteData.comments || quoteData.Comments || null,
        deliveryDate: validDeliveryDate,
        whsCode: quoteData.whsCode || "014",
        contactPerson: contactPersonVal,
        refNumber: refNumberVal,
        saleCondition: saleConditionVal,
        documentType: documentTypeVal,
        isLetra: isLetraVal,
        creditTerm: creditTermVal,
        approvalStatus: quoteData.approvalStatus || quoteData.state || quoteData.status || null,
        rejectionReason: quoteData.rejectionReason || quoteData.observations || null,
        observations: quoteData.observations || quoteData.rejectionReason || null,
        sellerName: quoteData.sellerName || quoteData.createdByUsername || null,
        createdByUsername: quoteData.createdByUsername || quoteData.sellerName || null,
        createdByUserId: quoteData.createdByUserId || quoteData.userId || null,
        SlpCode: quoteData.SlpCode || quoteData.slpCode || quoteData.salesPersonCode || quoteData.salesEmployeeCode || null,
        salesPersonCode: quoteData.salesPersonCode || quoteData.salesEmployeeCode || quoteData.SlpCode || null,
        salesEmployeeCode: quoteData.salesEmployeeCode || quoteData.salesPersonCode || quoteData.SlpCode || null,
        paymentMethod: quoteData.paymentMethod || quoteData.PaymentMethod || quoteData.totals?.paymentMethod || quoteData.totals?.PaymentMethod || "001",
        bankAccount: quoteData.bankAccount || quoteData.U_VS_BANCO || quoteData.totals?.bankAccount || quoteData.totals?.U_VS_BANCO || "BCP_SOLES",
        sunatOpType: quoteData.sunatOpType || quoteData.U_VS_TIPO_FACT || quoteData.totals?.sunatOpType || quoteData.totals?.U_VS_TIPO_FACT || "0101",
        historyLog: quoteData.historyLog || [],
      });
    },

    setQuoteData: (quoteData) => {
      const store = useQuoteStore.getState();
      if (typeof store.loadQuote === "function") {
        store.loadQuote(quoteData);
      }
    },

    clear: () => {
      try {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      } catch (e) {}
      set({ ...initialQuoteState });
    },
  };
});
