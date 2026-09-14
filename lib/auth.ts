import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

/**
 * Sessão + profile numa chamada só por request. O cache() do React dedupa
 * entre layout, página e server actions — sem isso cada navegação abria três
 * ou quatro idas ao Supabase em sequência, e era isso que pesava no clique.
 */
export const getSessao = cache(async () => {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return { supabase, user, profile: profile ?? null };
});

export async function getPerfil(): Promise<Profile | null> {
  const sessao = await getSessao();
  return sessao?.profile ?? null;
}
