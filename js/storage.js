/**
 * @file storage.js
 * @description IndexedDB storage manager for FoldC64.
 */

export class StorageManager {
  /**
   * @param {string} dbName - The name of the IndexedDB database.
   */
  constructor(dbName = 'foldc64') {
    this.dbName = dbName;
    this.dbVersion = 1;
    this.db = null;
  }

  /**
   * Initializes the IndexedDB database.
   * @returns {Promise<void>}
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create saveStates store
        if (!db.objectStoreNames.contains('saveStates')) {
          db.createObjectStore('saveStates', { keyPath: 'name' });
        }
        
        // Create settings store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
        
        // Create romCache store
        if (!db.objectStoreNames.contains('romCache')) {
          db.createObjectStore('romCache', { keyPath: 'name' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onerror = (event) => {
        console.error('IndexedDB error:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Helper to get an object store transaction.
   * @param {string} storeName - Name of the store.
   * @param {string} mode - Transaction mode ('readonly' or 'readwrite').
   * @returns {IDBObjectStore}
   */
  _getStore(storeName, mode) {
    const tx = this.db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  /**
   * Saves an emulator state.
   * @param {string} name - The name of the state.
   * @param {Blob|ArrayBuffer} data - The state data.
   * @param {Blob} [screenshot] - Optional screenshot of the state.
   * @returns {Promise<void>}
   */
  async saveState(name, data, screenshot = null) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._getStore('saveStates', 'readwrite');
        const stateObj = {
          name,
          data,
          timestamp: Date.now()
        };
        if (screenshot) {
          stateObj.screenshot = screenshot;
        }
        const request = store.put(stateObj);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      } catch (error) {
        console.error('Failed to save state:', error);
        reject(error);
      }
    });
  }

  /**
   * Loads an emulator state.
   * @param {string} name - The name of the state.
   * @returns {Promise<Object>} The state object.
   */
  async loadState(name) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._getStore('saveStates', 'readonly');
        const request = store.get(name);
        request.onsuccess = (e) => resolve(e.target.result);
        request.onerror = (e) => reject(e.target.error);
      } catch (error) {
        console.error('Failed to load state:', error);
        reject(error);
      }
    });
  }

  /**
   * Lists all saved states metadata (excluding large data blob).
   * @returns {Promise<Array>} Array of state metadata objects.
   */
  async listStates() {
    return new Promise((resolve, reject) => {
      try {
        const store = this._getStore('saveStates', 'readonly');
        const request = store.getAll();
        request.onsuccess = (e) => {
          const states = e.target.result.map(state => ({
            name: state.name,
            timestamp: state.timestamp,
            hasScreenshot: !!state.screenshot
          }));
          resolve(states);
        };
        request.onerror = (e) => reject(e.target.error);
      } catch (error) {
        console.error('Failed to list states:', error);
        reject(error);
      }
    });
  }

  /**
   * Deletes a saved state.
   * @param {string} name - The name of the state to delete.
   * @returns {Promise<void>}
   */
  async deleteState(name) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._getStore('saveStates', 'readwrite');
        const request = store.delete(name);
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      } catch (error) {
        console.error('Failed to delete state:', error);
        reject(error);
      }
    });
  }

  /**
   * Saves a setting preference.
   * @param {string} key - The setting key.
   * @param {*} value - The setting value.
   * @returns {Promise<void>}
   */
  async setSetting(key, value) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._getStore('settings', 'readwrite');
        const request = store.put({ key, value });
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      } catch (error) {
        console.error('Failed to set setting:', error);
        reject(error);
      }
    });
  }

  /**
   * Gets a setting preference.
   * @param {string} key - The setting key.
   * @returns {Promise<*>} The setting value.
   */
  async getSetting(key) {
    return new Promise((resolve, reject) => {
      try {
        const store = this._getStore('settings', 'readonly');
        const request = store.get(key);
        request.onsuccess = (e) => {
          const result = e.target.result;
          resolve(result ? result.value : undefined);
        };
        request.onerror = (e) => reject(e.target.error);
      } catch (error) {
        console.error('Failed to get setting:', error);
        reject(error);
      }
    });
  }

  /**
   * Gets all settings preferences.
   * @returns {Promise<Object>} Object containing all settings key-value pairs.
   */
  async getAllSettings() {
    return new Promise((resolve, reject) => {
      try {
        const store = this._getStore('settings', 'readonly');
        const request = store.getAll();
        request.onsuccess = (e) => {
          const result = e.target.result;
          const settingsObj = {};
          result.forEach(item => {
            settingsObj[item.key] = item.value;
          });
          resolve(settingsObj);
        };
        request.onerror = (e) => reject(e.target.error);
      } catch (error) {
        console.error('Failed to get all settings:', error);
        reject(error);
      }
    });
  }
}
