export interface AlertVariant {
  id: string;
  boxId: string;
  type: string;
  name: string;
  condition: string;
  duration: number;
  animationIn: string;
  animationOut: string;
  animationInDuration: number;
  animationOutDuration: number;
  
  // Design
  layout: 'text-below' | 'text-right' | 'text-over';
  bgColor: string;
  bgOpacity: number;
  padding: number;
  spacing: number;
  rounded: boolean;
  shadow: boolean;
  
  // Text
  message: string;
  fontFamily: string;
  fontWeight: string;
  fontSize: number;
  textAlign: 'left' | 'center' | 'right' | 'justify';
  textColor: string;
  highlightColor: string;
  textShadow: boolean;
  ttsEnabled: boolean;
  
  // Media
  imageScale: number;
  imageVolume: number;
  soundVolume: number;
  
  active: boolean;
  
  // Specific fields
  level?: string;
  giftAmount?: number;
  bitsFunction?: string;
  bitsAmount?: number;
  imageUrl?: string;
  imageName?: string;
  soundUrl?: string;
  soundName?: string;
}

export interface AlertBox {
  id: string;
  name: string;
  enabled: boolean;
}

export interface TemplateDB {
  id: string;
  name: string;
  data: any; // The Template object
  updatedAt: number;
}

const DB_NAME = 'AlertsDB';
const DB_VERSION = 2; // Incremented version

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains('boxes')) {
        db.createObjectStore('boxes', { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains('variants')) {
        const variantStore = db.createObjectStore('variants', { keyPath: 'id' });
        variantStore.createIndex('boxId', 'boxId', { unique: false });
        variantStore.createIndex('type', 'type', { unique: false });
      }

      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }
    };
  });
};

export const dbManager = {
  // Existing methods...
  async getTemplates(): Promise<TemplateDB[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('templates', 'readonly');
      const store = transaction.objectStore('templates');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveTemplate(template: TemplateDB): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('templates', 'readwrite');
      const store = transaction.objectStore('templates');
      const request = store.put(template);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteTemplate(id: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('templates', 'readwrite');
      const store = transaction.objectStore('templates');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
  async getBoxes(): Promise<AlertBox[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('boxes', 'readonly');
      const store = transaction.objectStore('boxes');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveBox(box: AlertBox): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('boxes', 'readwrite');
      const store = transaction.objectStore('boxes');
      const request = store.put(box);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteBox(id: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('boxes', 'readwrite');
      const store = transaction.objectStore('boxes');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async getVariants(boxId: string): Promise<AlertVariant[]> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('variants', 'readonly');
      const store = transaction.objectStore('variants');
      const index = store.index('boxId');
      const request = index.getAll(boxId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  },

  async saveVariant(variant: AlertVariant): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('variants', 'readwrite');
      const store = transaction.objectStore('variants');
      const request = store.put(variant);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },

  async deleteVariant(id: string): Promise<void> {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('variants', 'readwrite');
      const store = transaction.objectStore('variants');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
};
