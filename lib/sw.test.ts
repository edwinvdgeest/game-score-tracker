import { describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Tests voor public/sw.js.
 *
 * De service worker is los JavaScript zonder exports, dus hij wordt hier ingeladen met
 * een nagebouwde `self`, `caches` en `fetch`. Dat is omslachtiger dan een import, maar
 * de bug die dit bestand bewaakt — HTML uit de cache serveren terwijl het netwerk gewoon
 * werkt — is precies het soort fout dat je pas in productie merkt, en dan pas na een
 * deploy die "niet aankomt".
 */

interface FakeRequest {
  url: string;
  method: string;
  mode: string;
  headers: Headers;
  clone(): FakeRequest;
}

function makeRequest(
  url: string,
  init: { method?: string; mode?: string; headers?: Record<string, string> } = {}
): FakeRequest {
  const request: FakeRequest = {
    url,
    method: init.method ?? "GET",
    mode: init.mode ?? "cors",
    headers: new Headers(init.headers),
    clone: () => request,
  };
  return request;
}

class FakeCache {
  // Map houdt de invoegvolgorde vast, net als de echte Cache Storage. trimCache leunt daarop.
  entries = new Map<string, Response>();

  async match(request: FakeRequest | string) {
    const key = typeof request === "string" ? request : request.url;
    return this.entries.get(key) ?? this.entries.get(new URL(key, ORIGIN).href);
  }

  async put(request: FakeRequest | string, response: Response) {
    const key = typeof request === "string" ? request : request.url;
    this.entries.set(new URL(key, ORIGIN).href, response);
  }

  async keys() {
    return [...this.entries.keys()].map((url) => makeRequest(url));
  }

  async delete(request: FakeRequest | string) {
    const key = typeof request === "string" ? request : request.url;
    return this.entries.delete(new URL(key, ORIGIN).href);
  }
}

const ORIGIN = "https://spelscores.example";

interface Harness {
  caches: Map<string, FakeCache>;
  fetch: ReturnType<typeof vi.fn>;
  dispatch(type: string, event: Record<string, unknown>): Promise<void>;
  fetchEvent(request: FakeRequest): Promise<Response | undefined>;
  activate(): Promise<void>;
}

async function loadServiceWorker(): Promise<Harness> {
  const source = await readFile(join(process.cwd(), "public", "sw.js"), "utf8");

  const cacheStore = new Map<string, FakeCache>();
  const listeners = new Map<string, (event: Record<string, unknown>) => void>();
  const fetchMock = vi.fn(async () => new Response("netwerk"));

  const cachesStub = {
    open: async (name: string) => {
      if (!cacheStore.has(name)) cacheStore.set(name, new FakeCache());
      return cacheStore.get(name)!;
    },
    keys: async () => [...cacheStore.keys()],
    delete: async (name: string) => cacheStore.delete(name),
    match: async (request: FakeRequest) => {
      for (const cache of cacheStore.values()) {
        const hit = await cache.match(request);
        if (hit) return hit;
      }
      return undefined;
    },
  };

  const selfStub = {
    addEventListener: (type: string, handler: (event: Record<string, unknown>) => void) => {
      listeners.set(type, handler);
    },
    skipWaiting: () => {},
    clients: { claim: async () => {}, matchAll: async () => [] },
    location: { origin: ORIGIN },
  };

  const indexedDBStub = { open: () => ({}) };

  new Function("self", "caches", "fetch", "indexedDB", source)(
    selfStub,
    cachesStub,
    fetchMock,
    indexedDBStub
  );

  const pending: Promise<unknown>[] = [];

  const dispatch = async (type: string, event: Record<string, unknown>) => {
    listeners.get(type)?.({
      waitUntil: (p: Promise<unknown>) => pending.push(p),
      ...event,
    });
    await Promise.all(pending.splice(0));
  };

  return {
    caches: cacheStore,
    fetch: fetchMock,
    dispatch,
    async fetchEvent(request) {
      let responded: Promise<Response> | undefined;
      listeners.get("fetch")?.({
        request,
        respondWith: (p: Promise<Response>) => {
          responded = p;
        },
        waitUntil: () => {},
      });
      return responded ? await responded : undefined;
    },
    async activate() {
      await dispatch("activate", {});
    },
  };
}

describe("service worker — cachestrategie", () => {
  it("serveert een pagina van het netwerk, ook als er een oudere versie in de cache staat", async () => {
    const sw = await loadServiceWorker();
    const request = makeRequest(`${ORIGIN}/dashboard`, { mode: "navigate" });

    // Eerste bezoek vult de cache — dit is wat er na een deploy blijft staan.
    sw.fetch.mockResolvedValue(new Response("nieuwe deploy"));
    await sw.fetchEvent(request);

    sw.fetch.mockResolvedValue(new Response("nog nieuwere deploy"));
    const second = await sw.fetchEvent(request);

    expect(await second!.text()).toBe("nog nieuwere deploy");
    expect(sw.fetch).toHaveBeenCalledTimes(2);
  });

  it("valt terug op de cache zodra het netwerk faalt", async () => {
    const sw = await loadServiceWorker();
    const request = makeRequest(`${ORIGIN}/dashboard`, { mode: "navigate" });

    sw.fetch.mockResolvedValue(new Response("online versie"));
    await sw.fetchEvent(request);

    sw.fetch.mockRejectedValue(new Error("offline"));
    const offline = await sw.fetchEvent(request);

    expect(await offline!.text()).toBe("online versie");
  });

  it("haalt ook RSC-payloads van client-side navigatie eerst bij het netwerk", async () => {
    const sw = await loadServiceWorker();
    const request = makeRequest(`${ORIGIN}/history?_rsc=abc123`, {
      headers: { rsc: "1" },
    });

    sw.fetch.mockResolvedValue(new Response("rsc-payload-1"));
    await sw.fetchEvent(request);

    sw.fetch.mockResolvedValue(new Response("rsc-payload-2"));
    const second = await sw.fetchEvent(request);

    expect(await second!.text()).toBe("rsc-payload-2");
  });

  it("serveert gehashte chunks uit de cache zonder netwerkverzoek", async () => {
    const sw = await loadServiceWorker();
    const request = makeRequest(`${ORIGIN}/_next/static/chunks/main-abc123.js`);

    sw.fetch.mockResolvedValue(new Response("chunk"));
    await sw.fetchEvent(request);
    const second = await sw.fetchEvent(request);

    expect(await second!.text()).toBe("chunk");
    expect(sw.fetch).toHaveBeenCalledTimes(1);
  });

  it("laat andere schrijfacties dan POST /api/sessions ongemoeid", async () => {
    const sw = await loadServiceWorker();

    // cache.put() weigert een niet-GET request; die verzoeken horen dus langs de
    // service worker heen te gaan in plaats van door networkFirst te lopen.
    const patch = makeRequest(`${ORIGIN}/api/sessions/42`, { method: "PATCH" });
    expect(await sw.fetchEvent(patch)).toBeUndefined();

    const del = makeRequest(`${ORIGIN}/api/games/7`, { method: "DELETE" });
    expect(await sw.fetchEvent(del)).toBeUndefined();
  });

  it("laat verzoeken naar andere origins ongemoeid", async () => {
    const sw = await loadServiceWorker();
    const external = makeRequest("https://boardgamegeek.com/xmlapi2/thing?id=1");
    expect(await sw.fetchEvent(external)).toBeUndefined();
  });

  it("ruimt caches van een oudere service worker op, maar houdt de doosfoto's", async () => {
    const sw = await loadServiceWorker();
    sw.caches.set("spelscores-v3", new FakeCache());
    sw.caches.set("spelscores-images-v1", new FakeCache());
    sw.caches.set("iets-van-een-andere-app", new FakeCache());

    await sw.activate();

    expect(sw.caches.has("spelscores-v3")).toBe(false);
    expect(sw.caches.has("spelscores-images-v1")).toBe(true);
    expect(sw.caches.has("iets-van-een-andere-app")).toBe(true);
  });
});
