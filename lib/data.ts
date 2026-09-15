import type { SupabaseClient } from "@supabase/supabase-js";
import type { Rota, RotaResumo } from "@/lib/types";
import { resumoRota } from "@/lib/format";

/**
 * Junta as rotas com a contagem de pacotes. O agrupamento é feito aqui porque
 * PostgREST não faz group by — a volumetria de um MVP comporta bem.
 */
export async function comResumo(
  supabase: SupabaseClient,
  rotas: Rota[],
): Promise<RotaResumo[]> {
  if (rotas.length === 0) return [];

  const { data: pacotes } = await supabase
    .from("pacotes")
    .select("rota_id")
    .in(
      "rota_id",
      rotas.map((r) => r.id),
    );

  const contagem = new Map<string, number>();
  for (const p of pacotes ?? []) {
    contagem.set(p.rota_id, (contagem.get(p.rota_id) ?? 0) + 1);
  }

  return rotas.map((rota) => ({
    ...rota,
    ...resumoRota(rota.qtd_esperada, contagem.get(rota.id) ?? 0),
  }));
}
