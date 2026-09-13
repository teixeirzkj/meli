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
    .select("rota_id, excedente")
    .in(
      "rota_id",
      rotas.map((r) => r.id),
    );

  const contagem = new Map<string, { total: number; excedentes: number }>();
  for (const p of pacotes ?? []) {
    const atual = contagem.get(p.rota_id) ?? { total: 0, excedentes: 0 };
    atual.total += 1;
    if (p.excedente) atual.excedentes += 1;
    contagem.set(p.rota_id, atual);
  }

  return rotas.map((rota) => {
    const c = contagem.get(rota.id) ?? { total: 0, excedentes: 0 };
    return { ...rota, ...resumoRota(rota.qtd_esperada, c.total, c.excedentes) };
  });
}
