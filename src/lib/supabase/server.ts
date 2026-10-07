import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { connection } from "next/server";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** Cliente com a sessão do professor logado (RLS ativo). */
export async function createClient() {
  // A inicialização do auth consulta o relógio; deve ocorrer só na requisição.
  await connection();
  const cookieStore = await cookies();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado de Server Component: o proxy já renova a sessão.
        }
      },
    },
  });
}

/** Cliente com a secret key: ignora RLS. Usar só na página pública do aluno e no cron. */
export function createAdminClient() {
  return createSupabaseClient(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) throw new Error("Não autenticado");
  return { supabase, userId: data.claims.sub as string };
}
