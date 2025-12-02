// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// This client is for SERVER-SIDE use only (route handlers, edge functions, etc.)
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey);
