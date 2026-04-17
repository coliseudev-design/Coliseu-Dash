(function() {
  "use strict";
  const SYNC_INTERVAL = 3e4;
  const DB_NAME = "coliseu_dash_cache";
  const STORE_NAME = "sync_cache";
  let token = null;
  let timer = null;
  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function saveCache(key, data) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({ key, data, ts: Date.now() });
      await new Promise((r) => tx.oncomplete = r);
      db.close();
    } catch {
    }
  }
  async function loadCache(key) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE_NAME, "readonly");
      const req = tx.objectStore(STORE_NAME).get(key);
      return await new Promise((resolve) => {
        req.onsuccess = () => resolve(req.result?.data ?? null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  }
  async function syncData() {
    try {
      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch("/api/sync/status", { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      await saveCache("sync_status", data);
      try {
        const bc = new BroadcastChannel("coliseu-sync");
        bc.postMessage({ type: "SYNC_COMPLETE", data, timestamp: (/* @__PURE__ */ new Date()).toISOString() });
        bc.close();
      } catch {
      }
      self.postMessage({ type: "SYNC_COMPLETE", data });
    } catch (e) {
      self.postMessage({ type: "SYNC_ERROR", error: String(e?.message || e) });
    }
  }
  self.addEventListener("message", (evt) => {
    const msg = evt.data;
    if (msg.type === "INIT" || msg.type === "SYNC_NOW") {
      if (msg.token) token = msg.token;
      syncData();
      if (timer) clearInterval(timer);
      timer = setInterval(syncData, SYNC_INTERVAL);
    }
    if (msg.type === "SET_TOKEN" && msg.token) {
      token = msg.token;
    }
    if (msg.type === "STOP" && timer) {
      clearInterval(timer);
      timer = null;
    }
    if (msg.type === "LOAD_CACHE") {
      loadCache("sync_status").then(
        (d) => self.postMessage({ type: "CACHE_LOADED", data: d })
      );
    }
  });
})();
