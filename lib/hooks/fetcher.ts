/**
 * SWR-fetcher die op een foutstatus gooit in plaats van de foutbody als data door te geven.
 *
 * Dat laatste deed de app eerder wel, en dat gaf zichtbaar verkeerde UI: een 500 op
 * /api/marathon leverde `{ error: "..." }` op, en omdat dat object truthy is verscheen er
 * een "Marathon actief"-banner met een badge in de navigatie terwijl er geen marathon was.
 * Door te gooien belandt het in SWR's error-tak en blijft `data` undefined.
 */
export async function jsonFetcher<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    // Probeer de Nederlandse foutmelding van de API mee te nemen.
    let message = `Verzoek mislukt (${response.status})`;
    try {
      const body = (await response.json()) as { error?: unknown };
      if (typeof body?.error === "string") message = body.error;
    } catch {
      // Geen JSON-body; houd de statusmelding.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}
