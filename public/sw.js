// Service Worker — Spelscores offline queue
//
// Belangrijkste regel hier: HTML en RSC-payloads komen NOOIT als eerste uit de cache.
// Elke pagina in deze app is `force-dynamic`, dus de scores zitten ín de server-rendered
// HTML. Serveerde de service worker die HTML stale-while-revalidate (zoals t/m v3), dan
// kreeg een terugkerende gebruiker eerst de pagina van de vórige deploy te zien — met de
// data van toen. Een nieuwe deploy of een gecorrigeerde score landde daardoor pas na een
// handmatige bump van deze cachenaam, en in de geïnstalleerde webapp vaak helemaal niet.
//
// Vandaar de indeling hieronder:
//   navigatie + RSC  → network-first, cache alleen als offline-terugval
//   /_next/static/*  → cache-first; die URLs bevatten een content-hash en veranderen dus
//                      vanzelf bij een nieuwe build
//   /_next/image     → cache-first in een eigen cache
//   /api/*           → network-first
//
// Er zit bewust geen timeout op de navigatie-fetch: is het netwerk echt weg, dan faalt
// fetch meteen en pakken we de cache. Een trage verbinding hoort een trage pagina te
// geven, geen oude cijfers.
const SW_VERSION = "v4";

// Geversioneerde caches: worden bij activate weggegooid zodra SW_VERSION wijzigt.
const SHELL_CACHE = `spelscores-shell-${SW_VERSION}`;
const DATA_CACHE = `spelscores-data-${SW_VERSION}`;

// Niet-geversioneerde caches. Bewust los van SW_VERSION: de sleutels zijn al uniek per
// inhoud (content-hash resp. url+w+q), dus een versiebump zou alleen maar alle chunks en
// doosfoto's opnieuw laten downloaden.
const STATIC_CACHE = "spelscores-static-v1";
const IMAGE_CACHE_NAME = "spelscores-images-v1";

// Elke deploy voegt nieuwe chunk-URLs toe en de oude worden nooit meer opgevraagd. Zonder
// bovengrens groeit STATIC_CACHE dus mee met het aantal deploys. keys() geeft de invoeg-
// volgorde terug, dus de oudste entries gaan er als eerste uit.
const STATIC_CACHE_MAX_ENTRIES = 160;

const OFFLINE_QUEUE_STORE = "offline-queue";

// Pagina's die offline beschikbaar moeten blijven. Deze HTML wordt alléén getoond als het
// netwerk faalt; online wint altijd de verse respons.
const PRECACHE_URLS = [
  "/",
  "/dashboard",
  "/marathon",
  "/history",
  "/suggest",
  "/games",
  "/achievements",
  "/seasons",
  "/duel",
  "/players",
];

// Caches die deze versie in leven houdt. Alles daarbuiten met het "spelscores-"-voorvoegsel
// is van een oudere service worker en wordt bij activate verwijderd.
const KEEP_CACHES = [SHELL_CACHE, DATA_CACHE, STATIC_CACHE, IMAGE_CACHE_NAME];

// ——————————————————————————————————————————
// Install: leg de offline-terugval klaar
// ——————————————————————————————————————————
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Per URL, niet via addAll: die faalt in zijn geheel zodra één pagina een foutstatus
      // geeft, en dan staat er offline helemaal niets klaar.
      Promise.all(
        PRECACHE_URLS.map((url) =>
          fetch(url, { cache: "no-store" })
            .then((response) => (response.ok ? cache.put(url, response) : null))
            .catch(() => null)
        )
      )
    )
  );
  self.skipWaiting();
});

// ——————————————————————————————————————————
// Activate: verwijder caches van oudere versies
// ——————————————————————————————————————————
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("spelscores-") && !KEEP_CACHES.includes(k))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ——————————————————————————————————————————
// Fetch
// ——————————————————————————————————————————
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Sla POST /api/sessions op in offline queue als offline
  if (request.method === "POST" && url.pathname === "/api/sessions") {
    event.respondWith(handleSessionPost(request));
    return;
  }

  // Alles wat verder niet-GET is (score corrigeren, spel archiveren, speler toevoegen)
  // gaat rechtstreeks naar het netwerk. Niet afvangen: cache.put() weigert een niet-GET
  // request, dus zo'n respons viel hier vroeger in een afgewezen promise.
  if (request.method !== "GET") return;

  // Andere origins (analytics, externe scripts) laten we met rust.
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  if (url.pathname === "/_next/image") {
    event.respondWith(cacheFirst(request, IMAGE_CACHE_NAME));
    return;
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, STATIC_CACHE_MAX_ENTRIES));
    return;
  }

  // Pagina's en de RSC-payloads van client-side navigatie: altijd eerst het netwerk.
  if (isAppContent(request, url)) {
    event.respondWith(navigationHandler(request));
    return;
  }

  // Rest van de statische bestanden (icons, manifest.json, favicon): een verouderd icoon
  // doet niemand pijn, dus hier mag stale-while-revalidate blijven staan.
  event.respondWith(staleWhileRevalidate(request, STATIC_CACHE));
});

/**
 * Herkent verzoeken die door de server gerenderde app-inhoud opleveren: een echte
 * paginanavigatie, of de RSC-payload die de router ophaalt bij een client-side navigatie
 * of prefetch. Next.js markeert die laatste met de `rsc`-header en de `_rsc`-queryparameter.
 */
function isAppContent(request, url) {
  return (
    request.mode === "navigate" ||
    request.headers.get("rsc") !== null ||
    url.searchParams.has("_rsc")
  );
}

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

/**
 * Network-first voor pagina's. Lukt het netwerk niet, dan de laatst gelukte versie van
 * deze pagina; is die er ook niet, dan de startpagina uit PRECACHE_URLS — beter een
 * bruikbare app-shell dan een browserfoutmelding.
 */
async function navigationHandler(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const shell = await cache.match("/");
      if (shell) return shell;
    }
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    // Alleen geslaagde responses cachen. Anders belandt een 500 in de cache en krijg je
    // die later offline terug als "antwoord".
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached ?? new Response(JSON.stringify({ error: "Offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}

async function cacheFirst(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
      if (maxEntries) await trimCache(cache, maxEntries);
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  return cached ?? (await networkPromise) ?? new Response("Offline", { status: 503 });
}

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(
    keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key))
  );
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
