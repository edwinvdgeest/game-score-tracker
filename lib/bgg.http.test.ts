/**
 * Test van de BGG-fetchlaag tegen een lokale server met de fixture-XML.
 *
 * Wijkt bewust af van de "alleen pure functies"-conventie in deze map: de
 * wachtrij- en rate-limit-afhandeling van BGG is precies het stuk dat je niet
 * met een pure functie kunt afdekken, en boardgamegeek.com is niet bereikbaar
 * vanuit de ontwikkelomgeving. Deze test doet geen enkel verzoek naar buiten —
 * de server draait op 127.0.0.1 en stopt na afloop.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";
import { fetchBggSearch, fetchBggThing, BggUnavailableError } from "@/lib/bgg";
import { bggSearchTermFor, pickBestBggMatch } from "@/lib/bgg-match";
import { mapBggThingToGameMetadata } from "@/lib/game-metadata";
import {
  SEARCH_XML_QWIXX,
  SEARCH_XML_EMPTY,
  THING_XML_QWIXX,
} from "@/lib/bgg.fixtures";

let server: Server;
let originalBaseUrl: string | undefined;

/** Aantal keer dat een pad nog met een statuscode moet antwoorden. */
const pending = { queued: 0, rateLimited: 0, serverError: 0 };

beforeAll(async () => {
  server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");

    if (pending.queued > 0) {
      pending.queued--;
      res.writeHead(202).end("");
      return;
    }
    if (pending.rateLimited > 0) {
      pending.rateLimited--;
      res.writeHead(429).end("");
      return;
    }
    if (pending.serverError > 0) {
      pending.serverError--;
      res.writeHead(500).end("");
      return;
    }

    if (url.pathname === "/search") {
      const q = (url.searchParams.get("query") ?? "").toLowerCase();
      const body = q.includes("qwixx") ? SEARCH_XML_QWIXX : SEARCH_XML_EMPTY;
      res.writeHead(200, { "Content-Type": "application/xml" }).end(body);
      return;
    }
    if (url.pathname === "/thing") {
      res.writeHead(200, { "Content-Type": "application/xml" }).end(THING_XML_QWIXX);
      return;
    }
    res.writeHead(404).end("");
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  originalBaseUrl = process.env.BGG_BASE_URL;
  process.env.BGG_BASE_URL = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  if (originalBaseUrl === undefined) delete process.env.BGG_BASE_URL;
  else process.env.BGG_BASE_URL = originalBaseUrl;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("fetchBggSearch", () => {
  it("haalt treffers op en parseert ze", async () => {
    const hits = await fetchBggSearch("Qwixx");
    expect(hits).toHaveLength(4);
    expect(hits[0]?.name).toBe("Qwixx");
  });

  it("geeft een lege lijst bij een zoekterm zonder treffers", async () => {
    expect(await fetchBggSearch("Mozaa")).toEqual([]);
  });

  it("wacht een 202 uit en probeert het opnieuw", async () => {
    pending.queued = 2;
    const waits: string[] = [];
    const hits = await fetchBggSearch("Qwixx", {
      onWait: (_ms, reason) => waits.push(reason),
    });
    expect(waits).toEqual(["queued", "queued"]);
    expect(hits).toHaveLength(4);
  }, 20_000);

  it("valt terug bij een 429 en probeert het opnieuw", async () => {
    pending.rateLimited = 1;
    const waits: string[] = [];
    const hits = await fetchBggSearch("Qwixx", {
      onWait: (_ms, reason) => waits.push(reason),
    });
    expect(waits).toEqual(["rate-limit"]);
    expect(hits).toHaveLength(4);
  }, 20_000);

  it("gooit een herkenbare fout bij een serverfout", async () => {
    pending.serverError = 1;
    await expect(fetchBggSearch("Qwixx")).rejects.toBeInstanceOf(BggUnavailableError);
  });
});

describe("volledig ophaalpad", () => {
  it("koppelt een spelnaam via zoeken en ophalen aan een metadata-patch", async () => {
    const term = bggSearchTermFor("Qwixx");
    const hits = await fetchBggSearch(term);
    const match = pickBestBggMatch(term, hits);
    expect(match?.hit.id).toBe(131260);

    const thing = await fetchBggThing(match!.hit.id);
    expect(thing?.name).toBe("Qwixx");

    const patch = mapBggThingToGameMetadata(thing!);
    expect(patch.bgg_id).toBe(131260);
    expect(patch.image_url).toContain("cf.geekdo-images.com");
    expect(patch.bgg_sync_error).toBeNull();
  });

  it("vertaalt een Nederlandse titel voordat er gezocht wordt", async () => {
    // Regenwormen bestaat niet onder die naam op BGG; de alias zoekt op
    // "Heckmeck am Bratwurmeck". De neppe server kent die niet, dus we
    // controleren hier alleen dat de vertaalde term wordt gebruikt.
    expect(bggSearchTermFor("Regenwormen")).toBe("Heckmeck am Bratwurmeck");
    expect(await fetchBggSearch(bggSearchTermFor("Regenwormen"))).toEqual([]);
  });
});
