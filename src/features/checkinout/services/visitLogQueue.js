import { openDB } from "idb";

const DB_NAME = "checkin-offline-db";
const STORE_NAME = "pending-checkins";

const getDB = () =>
  openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    },
  });

// FormData → objeto guardable en IndexedDB (preserva el File/Blob)
export const formDataToStorable = async (formData) => {
  const obj = {};
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      obj[key] = {
        __type: "File",
        blob: value,
        name: value.name,
        mime: value.type,
      };
    } else {
      obj[key] = value;
    }
  }
  return obj;
};

// Objeto de IndexedDB → FormData para reenviar al backend
export const storableToFormData = (obj) => {
  const fd = new FormData();
  for (const [key, value] of Object.entries(obj)) {
    if (value?.__type === "File") {
      const file = new File([value.blob], value.name, { type: value.mime });
      fd.append(key, file);
    } else {
      fd.append(key, value);
    }
  }
  return fd;
};

export const addToQueue = async (formData) => {
  const db = await getDB();
  const storable = await formDataToStorable(formData);
  const id = await db.add(STORE_NAME, {
    ...storable,
    status: "PENDING",
    _queuedAt: Date.now(),
  });
  console.log("📦 Check-in guardado offline con id:", id);
  return id;
};

export const getQueue = async () => {
  const db = await getDB();
  return db.getAll(STORE_NAME);
};

export const removeFromQueue = async (id) => {
  const db = await getDB();
  await db.delete(STORE_NAME, id);
};

export const clearAllQueue = async () => {
  const db = await getDB();
  await db.clear(STORE_NAME);
};

export const getQueueCount = async () => {
  const db = await getDB();
  return db.count(STORE_NAME);
};

export const updateQueueItem = async (id, updates) => {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  const item = await store.get(id);
  if (item) {
    Object.assign(item, updates);
    await store.put(item);
  }
  await tx.done;
};

// Estados de un ítem en cola.
// PENDING / SYNCING → se reintentan solos.
// NEEDS_REVIEW      → el servidor lo rechazó por regla de negocio. NO se borra
//                     automáticamente ni se reintenta a ciegas: requiere que el
//                     vendedor o un admin lo concilie, para no perder la visita.
export const QUEUE_STATUS = {
  PENDING: "PENDING",
  SYNCING: "SYNCING",
  SYNCED: "SYNCED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
};

// Un ítem sigue "en vuelo" mientras no esté confirmado por el servidor.
export const isUnsynced = (item) => item.status !== QUEUE_STATUS.SYNCED;

const norm = (v) => String(v ?? "").trim().toLowerCase();

// El vendedor se identifica sin distinguir mayúsculas y aceptando el código SAP
// como respaldo: al reiniciar sesión el nombre puede volver con otra grafía y
// antes eso volvía "invisible" su propia cola.
export const belongsToVendor = (item, vendorName, vendorCode) => {
  if (vendorCode && item.vendorCode && norm(item.vendorCode) === norm(vendorCode)) return true;
  return !!vendorName && norm(item.vendorName) === norm(vendorName);
};

/**
 * Devuelve los ítems del vendedor que aún no están confirmados por el servidor.
 * Es la base de la regla "si hay algo en vuelo, se encola" de useVisitSubmit.
 */
export const getUnsyncedForVendor = async (vendorName, vendorCode) => {
  const queue = await getQueue();
  return queue
    .filter((i) => belongsToVendor(i, vendorName, vendorCode) && isUnsynced(i))
    .sort((a, b) => a.id - b.id);
};

/**
 * Fusiona el estado del servidor con la cola local para decidir si hay un
 * Check-In abierto. La cola manda sobre el servidor porque puede contener marcas
 * que aún no viajaron.
 */
export const getActiveVisitState = async (vendorName, serverActiveVisitData, vendorCode) => {
  let hasActiveCheckIn = serverActiveVisitData?.active || false;
  let activeVisit = serverActiveVisitData?.visit || null;

  const queue = await getQueue();
  const vendorQueue = queue
    .filter((item) => belongsToVendor(item, vendorName, vendorCode))
    .sort((a, b) => a.id - b.id);

  for (const item of vendorQueue) {
    // Un ítem ya confirmado no aporta: el servidor ya lo refleja.
    if (item.status === QUEUE_STATUS.SYNCED) continue;

    if (item.type === "IN") {
      hasActiveCheckIn = true;
      activeVisit = {
        id: `local-${item.id}`,
        storeName: item.storeName,
        sapCode: item.sapCode || null,
        latitude: item.latitude,
        longitude: item.longitude,
        createdAt: item.createdAt || item._queuedAt || Date.now(),
        visitGroupId: item.visitGroupId || null,
        isLocal: true,
        status: item.status || QUEUE_STATUS.PENDING,
        needsReview: item.status === QUEUE_STATUS.NEEDS_REVIEW,
        errorMessage: item.errorMessage || null,
      };
    } else if (item.type === "OUT") {
      hasActiveCheckIn = false;
      activeVisit = null;
    }
  }

  return { active: hasActiveCheckIn, visit: activeVisit };
};

/**
 * visitGroupId del Check-In abierto, para que el Check-Out se empareje con él.
 * Busca primero en la cola local y cae al dato del servidor.
 */
export const getOpenVisitGroupId = async (vendorName, vendorCode, serverActiveVisit) => {
  const queue = await getQueue();
  const vendorQueue = queue
    .filter((item) => belongsToVendor(item, vendorName, vendorCode))
    .sort((a, b) => a.id - b.id);

  let groupId = serverActiveVisit?.visitGroupId || null;
  for (const item of vendorQueue) {
    if (item.status === QUEUE_STATUS.SYNCED) continue;
    if (item.type === "IN") groupId = item.visitGroupId || groupId;
    else if (item.type === "OUT") groupId = null;
  }
  return groupId;
};