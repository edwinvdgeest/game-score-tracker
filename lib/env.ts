import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  // Alle drie optioneel: zonder deze variabelen draait de app precies zoals voorheen.
  // Zonder ANTHROPIC_API_KEY wordt het genereren van Nederlandse teksten stil
  // overgeslagen; BGG-afbeeldingen werken gewoon door.
  //
  // Let op: dit bestand wordt ook geïmporteerd door lib/supabase/client.ts, een
  // client-module. In de browser is ANTHROPIC_API_KEY altijd undefined — Next
  // inlinet alleen NEXT_PUBLIC_*, dus de sleutel lekt niet, en isClaudeEnabled()
  // geeft client-side terecht false.
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  BGG_BASE_URL: z.string().url().optional(),
  ENRICH_TOKEN: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  BGG_BASE_URL: process.env.BGG_BASE_URL,
  ENRICH_TOKEN: process.env.ENRICH_TOKEN,
});

if (!parsed.success) {
  // During build, only warn — pages handle missing config gracefully.
  // During runtime with real requests, Supabase will fail with a clear error.
  const isBuild = process.env.NEXT_PHASE === "phase-production-build";
  if (isBuild) {
    console.warn(
      "⚠️  Supabase environment variables not set. Set them in .env.local before running the app."
    );
  } else {
    console.error(
      "❌ Invalid environment variables:",
      parsed.error.flatten().fieldErrors
    );
    console.error("Maak een .env.local bestand aan (zie .env.example).");
  }
}

// Export with fallback empty strings so the module always loads.
// The app will show errors when Supabase calls fail without real credentials.
export const env = parsed.success
  ? parsed.data
  : {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      BGG_BASE_URL: process.env.BGG_BASE_URL,
      ENRICH_TOKEN: process.env.ENRICH_TOKEN,
    };
