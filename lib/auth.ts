import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { lerSessaoDoCookie } from "@/lib/supabase/sessao-cookie";
import type { Profile } from "@/lib/types";

/**
 * Sessão + profile numa leitura só por request. Duas economias aqui:
 *
 * 1. O cache() do React dedupa entre layout, página e actions — sem isso cada
 *    navegação abria a mesma consulta três ou quatro vezes.
 * 2. O id do usuário sai do próprio cookie, sem chamar /auth/v1/user. Quem
 *    valida o token continua sendo o Postgres: a consulta abaixo vai com o JWT
 *    e, se ele estiver vencido ou adulterado, volta erro e a sessão é tratada
 *    como inexistente. Um id forjado no cookie também não leva a nada, porque
 *    a RLS responde a auth.uid(), não ao que mandamos no filtro.
 */
export const getSessao = cache(async () => {
  const store = await cookies();
  const doCookie = lerSessaoDoCookie(store.getAll());

  if (!doCookie) return null;

  const supabase = await createClient();

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", doCookie.userId)
    .maybeSingle<Profile>();

  if (error) return null;

  return { supabase, userId: doCookie.userId, profile: profile ?? null };
});

export async function getPerfil(): Promise<Profile | null> {
  const sessao = await getSessao();
  return sessao?.profile ?? null;
}
