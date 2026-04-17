/// <reference lib="webworker" />
// Web Worker de sincronização
// - Faz polling em /api/sync/status a cada 30s
// - Armazena em IndexedDB (cache offline-first)
// - Notifica abas via BroadcastChannel

const SYNC_INTERVAL = 30_000
const DB_NAME = 'coliseu_dash_cache'
const STORE_NAME = 'sync_cache'

let token: string | null = null
let timer: number | null = null

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function saveCache(key: string, data: unknown) {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put({ key, data, ts: Date.now() })
    await new Promise((r) => (tx.oncomplete = r as any))
    db.close()
  } catch { /* ignore */ }
}

async function loadCache(key: string): Promise<any | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(key)
    return await new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result?.data ?? null)
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

async function syncData() {
  try {
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch('/api/sync/status', { headers })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()

    await saveCache('sync_status', data)

    // Notifica todas abas (frontend escuta)
    try {
      const bc = new BroadcastChannel('coliseu-sync')
      bc.postMessage({ type: 'SYNC_COMPLETE', data, timestamp: new Date().toISOString() })
      bc.close()
    } catch { /* ignore */ }

    self.postMessage({ type: 'SYNC_COMPLETE', data })
  } catch (e: any) {
    self.postMessage({ type: 'SYNC_ERROR', error: String(e?.message || e) })
  }
}

self.addEventListener('message', (evt: MessageEvent) => {
  const msg = evt.data as { type: string; token?: string }
  if (msg.type === 'INIT' || msg.type === 'SYNC_NOW') {
    if (msg.token) token = msg.token
    syncData()
    if (timer) clearInterval(timer)
    timer = setInterval(syncData, SYNC_INTERVAL) as unknown as number
  }
  if (msg.type === 'SET_TOKEN' && msg.token) {
    token = msg.token
  }
  if (msg.type === 'STOP' && timer) {
    clearInterval(timer)
    timer = null
  }
  if (msg.type === 'LOAD_CACHE') {
    loadCache('sync_status').then((d) =>
      self.postMessage({ type: 'CACHE_LOADED', data: d }),
    )
  }
})

export {}
