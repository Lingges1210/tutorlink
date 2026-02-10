import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServerAnon() {
  const cookieStore = await cookies(); // ✅ Next 15: cookies() is async

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // ✅ In Route Handlers this works, but TS may type it as "readonly"
          // so we cast to any.
          cookiesToSet.forEach(({ name, value, options }) => {
            (cookieStore as any).set(name, value, options);
          });
        },
      },
    }
  );
}
