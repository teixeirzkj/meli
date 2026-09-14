import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Conferencia } from "./Conferencia";
import type { AppConfig, Pacote, Rota } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RotaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // As três consultas são independentes (pacotes já filtra pelo id da URL):
  // em série, cada navegação somava três idas ao banco.
  const [{ data: rota }, { data: pacotes }, { data: config }] = await Promise.all([
    supabase.from("rotas").select("*").eq("id", id).maybeSingle<Rota>(),
    supabase
      .from("pacotes")
      .select("*")
      .eq("rota_id", id)
      .order("created_at", { ascending: false }),
    supabase.from("app_config").select("*").eq("id", true).maybeSingle<AppConfig>(),
  ]);

  if (!rota) notFound();

  return (
    <Conferencia
      rota={rota}
      pacotesIniciais={(pacotes ?? []) as Pacote[]}
      config={config ?? { id: true, codigo_min_digitos: 1, codigo_max_digitos: 40, updated_at: "" }}
    />
  );
}
