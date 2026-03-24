import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

// Singleton browser client — safe to import in client components
export const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
