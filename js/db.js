const DB_NAME = 'TaskFlowDB';
const DB_VERSION = 1;
const STORE_NAME = 'tasks';
class TaskDatabase {
  constructor() { this.db = null; this.isReady = false; }
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
      request.onsuccess = (e) => { this.db = e.target.result; this.isReady = true; resolve(this.db); };
    });
  }
  async getAll() {
    if (!this.isReady) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async add(task) {
    if (!this.isReady) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).add(task);
      req.onsuccess = () => resolve(task);
      req.onerror = () => reject(req.error);
    });
  }
  async delete(id) {
    if (!this.isReady) await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_NAME, 'readwrite');
      const req = tx.objectStore(STORE_NAME).delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }
}
const taskDB = new TaskDatabase();
