import { supabaseServer } from "@/lib/supabaseServer";

export async function requireUser() {
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getUser();

  if (error || !data?.user) {
    throw new Error("UNAUTHENTICATED");
  }

  return data.user; // { id, email, ... }
}