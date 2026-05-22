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

export const getQueueCount = async () => {
  const db = await getDB();
  return db.count(STORE_NAME);
};