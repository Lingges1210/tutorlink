import { createClient } from "@supabase/supabase-js";

export function supabaseServerAnon() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(url, anon, {
    auth: { persistSession: false },
  });
}
