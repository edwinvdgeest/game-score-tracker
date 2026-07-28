/**
 * Simpele sliding-window limiter in het geheugen van het proces.
 *
 * LET OP: serverless-instances delen dit geheugen niet, dus dit vangt alleen een
 * burst die op één warme instance landt. Het is bewust het tweede net — de echte
 * rem is de cooldown per rij in de database (zie enrichCooldownRemainingMs), die
 * wél over instances heen werkt.
 */

const hits = new Map<string, number[]>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

export function checkRateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): RateLimitResult {
  const now = Date.now();
  const cutoff = now - opts.windowMs;

  const recent = (hits.get(key) ?? []).filter((t) => t > cutoff);

  const oldest = recent[0];
  if (recent.length >= opts.limit && oldest !== undefined) {
    hits.set(key, recent);
    return { allowed: false, retryAfterMs: oldest + opts.windowMs - now };
  }

  recent.push(now);
  hits.set(key, recent);
  return { allowed: true, retryAfterMs: 0 };
}

/** Alleen voor tests. */
export function resetRateLimit(): void {
  hits.clear();
}
