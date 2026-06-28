import { QueueItem, AppSettings, MarketplaceTemplate, DEFAULT_TEMPLATES } from "../types";

const DB_NAME = "MicrostockMetadataGeneratorDB";
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("Failed to open IndexedDB database.");
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains("queue_items")) {
        db.createObjectStore("queue_items", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("templates")) {
        db.createObjectStore("templates", { keyPath: "id" });
      }
    };
  });
}

export async function saveQueueItem(item: QueueItem): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("queue_items", "readwrite");
    const store = transaction.objectStore("queue_items");
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getQueueItems(): Promise<QueueItem[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("queue_items", "readonly");
    const store = transaction.objectStore("queue_items");
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort by creation date descending
      const items = request.result as QueueItem[];
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      resolve(items);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function deleteQueueItem(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("queue_items", "readwrite");
    const store = transaction.objectStore("queue_items");
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllQueueItems(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("queue_items", "readwrite");
    const store = transaction.objectStore("queue_items");
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("settings", "readwrite");
    const store = transaction.objectStore("settings");
    const request = store.put({ id: "current_settings", ...settings });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getAppSettings(): Promise<AppSettings> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("settings", "readonly");
    const store = transaction.objectStore("settings");
    const request = store.get("current_settings");

    request.onsuccess = () => {
      if (request.result) {
        // Exclude the ID used for storing
        const { id, ...settings } = request.result;
        const resolvedSettings = settings as AppSettings;
        if (!resolvedSettings.activeMarketplaces || resolvedSettings.activeMarketplaces.length === 0) {
          resolvedSettings.activeMarketplaces = [resolvedSettings.activeMarketplace || "shutterstock"];
        }
        resolve(resolvedSettings);
      } else {
        // Return default settings
        resolve({
          providerConfig: {
            provider: "gemini",
            apiKey: "",
            baseUrl: "",
            model: "gemini-3.5-flash",
            temperature: 0.5,
            maxTokens: 2048,
            timeout: 30,
            retryCount: 2,
            concurrentRequests: 3,
          },
          activeMarketplace: "shutterstock",
          activeMarketplaces: ["shutterstock"],
          theme: "light",
          preset: "balanced",
        });
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveTemplates(templates: MarketplaceTemplate[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("templates", "readwrite");
    const store = transaction.objectStore("templates");
    
    // Clear old templates first
    store.clear().onsuccess = () => {
      let count = 0;
      if (templates.length === 0) {
        resolve();
        return;
      }
      templates.forEach((template) => {
        const req = store.put(template);
        req.onsuccess = () => {
          count++;
          if (count === templates.length) {
            resolve();
          }
        };
        req.onerror = () => reject(req.error);
      });
    };
  });
}

export async function getTemplates(): Promise<MarketplaceTemplate[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("templates", "readonly");
    const store = transaction.objectStore("templates");
    const request = store.getAll();

    request.onsuccess = () => {
      if (request.result && request.result.length > 0) {
        resolve(request.result as MarketplaceTemplate[]);
      } else {
        resolve(DEFAULT_TEMPLATES);
      }
    };
    request.onerror = () => reject(request.error);
  });
}
