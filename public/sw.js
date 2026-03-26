// Service Worker — Spelscores offline queue
const CACHE_NAME = "spelscores-v1";
const OFFLINE_QUEUE_STORE = "offline-queue";

// App shell bestanden die gecached worden
const PRECACHE_URLS = ["/", "/dashboard", "/history", "/suggest", "/games", "/achievements"];

// ——————————————————————————————————————————
// Install: cache de app shell
// ——————————————————————————————————————————
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ——————————————————————————————————————————
// Activate: verwijder oude caches
// ——————————————————————————————————————————
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ——————————————————————————————————————————
// Fetch: stale-while-revalidate voor navigatie, network-first voor API
// ——————————————————————————————————————————
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Sla POST /api/sessions op in offline queue als offline
  if (request.method === "POST" && url.pathname === "/api/sessions") {
    event.respondWith(handleSessionPost(request));
    return;
  }

  // API routes: network-first, fallback naar cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Navigatie & statische bestanden: stale-while-revalidate
  event.respondWith(staleWhileRevalidate(request));
});

async function handleSessionPost(request) {
  try {
    const response = await fetch(request.clone());
    return response;
  } catch {
    // Offline: sla op in IndexedDB queue
    const body = await request.clone().json();
    await addToOfflineQueue(body);
    // Stuur fake 200 terug zodat de UI geen foutmelding toont
    return new Response(
      JSON.stringify({ success: true, queued: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached ?? (await networkPromise) ?? new Response("Offline", { status: 503 });
}

// ——————————————————————————————————————————
// IndexedDB helpers voor offline queue
// ——————————————————————————————————————————
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("spelscores-offline", 1);
    req.onupgradeneeded = (e) => {
      e.target.result.createObjectStore(OFFLINE_QUEUE_STORE, {
        keyPath: "id",
        autoIncrement: true,
      });
    };
    req.onsuccess = (e) => resolve(e.target.result);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function addToOfflineQueue(data) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, "readwrite");
    tx.objectStore(OFFLINE_QUEUE_STORE).add({ data, timestamp: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

async function getOfflineQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, "readonly");
    const req = tx.objectStore(OFFLINE_QUEUE_STORE).getAll();
    req.onsuccess = (e) => resolve(e.result ?? []);
    req.onerror = (e) => reject(e.target.error);
  });
}

async function removeFromQueue(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(OFFLINE_QUEUE_STORE, "readwrite");
    tx.objectStore(OFFLINE_QUEUE_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

// ——————————————————————————————————————————
// Sync: verwerk de queue als we weer online zijn
// ——————————————————————————————————————————
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-sessions") {
    event.waitUntil(syncOfflineQueue());
  }
});

// Luister ook naar online event via message
self.addEventListener("message", (event) => {
  if (event.data?.type === "SYNC_QUEUE") {
    event.waitUntil(syncOfflineQueue());
  }
  if (event.data?.type === "GET_QUEUE_LENGTH") {
    getOfflineQueue().then((queue) => {
      event.ports[0]?.postMessage({ length: queue.length });
    });
  }
});

async function syncOfflineQueue() {
  const queue = await getOfflineQueue();
  let synced = 0;

  for (const item of queue) {
    try {
      const response = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.data),
      });
      if (response.ok) {
        await removeFromQueue(item.id);
        synced++;
      }
    } catch {
      break; // Stop als we nog steeds offline zijn
    }
  }

  if (synced > 0) {
    // Stuur bericht naar alle clients
    const clients = await self.clients.matchAll();
    clients.forEach((client) =>
      client.postMessage({ type: "QUEUE_SYNCED", count: synced })
    );
  }
}
