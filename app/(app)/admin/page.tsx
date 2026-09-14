import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { comResumo } from "@/lib/data";
import { temServiceRole } from "@/lib/supabase/admin";
import { ultimosMeses } from "@/lib/format";
import { AdminPanel } from "./AdminPanel";
import type {
  AppConfig,
  ManutencaoLog,
  MesFaturamento,
  Pagamento,
  Profile,
  Rota,
  UsuarioAdmin,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const sessao = await getSessao();
  if (!sessao?.profile || sessao.profile.tipo !== "admin") redirect("/");

  const { supabase } = sessao;

  const [
    { data: perfis },
    { data: pagamentos, error: erroPagamentos },
    { data: rotas },
    { data: config },
    { data: ultimaLimpeza },
  ] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase
        .from("pagamentos")
        .select("*")
        .order("data_pagamento", { ascending: false })
        .limit(500),
      supabase.from("rotas").select("*").order("created_at", { ascending: false }).limit(40),
      supabase.from("app_config").select("*").eq("id", true).maybeSingle<AppConfig>(),
      supabase
        .from("manutencao_log")
        .select("*")
        .order("executado_em", { ascending: false })
        .limit(1)
        .maybeSingle<ManutencaoLog>(),
    ]);

  const listaPerfis = (perfis ?? []) as Profile[];
  const listaPagamentos = ((pagamentos ?? []) as Pagamento[]).map((p) => ({
    ...p,
    valor: Number(p.valor),
  }));
  const listaRotas = await comResumo(supabase, (rotas ?? []) as Rota[]);

  // Contagens por usuário: agrupadas aqui porque PostgREST não faz group by.
  const rotasPorUsuario = new Map<string, number>();
  for (const rota of (rotas ?? []) as Rota[]) {
    rotasPorUsuario.set(rota.user_id, (rotasPorUsuario.get(rota.user_id) ?? 0) + 1);
  }

  const pagamentosPorUsuario = new Map<string, { qtd: number; total: number; ultimo: string }>();
  for (const pagamento of listaPagamentos) {
    const atual = pagamentosPorUsuario.get(pagamento.user_id) ?? {
      qtd: 0,
      total: 0,
      ultimo: pagamento.data_pagamento,
    };
    atual.qtd += 1;
    atual.total += pagamento.valor;
    if (pagamento.data_pagamento > atual.ultimo) atual.ultimo = pagamento.data_pagamento;
    pagamentosPorUsuario.set(pagamento.user_id, atual);
  }

  const usuarios: UsuarioAdmin[] = listaPerfis.map((perfil) => {
    const pag = pagamentosPorUsuario.get(perfil.id);
    return {
      ...perfil,
      // Antes da migration 0002 a coluna não existe; sem isso todo mundo
      // apareceria como "sem acesso" no painel.
      status: perfil.status ?? "ativo",
      rotas: rotasPorUsuario.get(perfil.id) ?? 0,
      pacotes: 0,
      pagamentos: pag?.qtd ?? 0,
      totalPago: pag?.total ?? 0,
      ultimoPagamento: pag?.ultimo ?? null,
    };
  });

  // Série de 6 meses com os meses vazios preenchidos — buraco no eixo do
  // tempo mente sobre a tendência.
  const porCompetencia = new Map<string, { total: number; quantidade: number }>();
  for (const pagamento of listaPagamentos) {
    const chave = pagamento.competencia.slice(0, 10);
    const atual = porCompetencia.get(chave) ?? { total: 0, quantidade: 0 };
    atual.total += pagamento.valor;
    atual.quantidade += 1;
    porCompetencia.set(chave, atual);
  }

  const faturamento: MesFaturamento[] = ultimosMeses(6).map((competencia) => ({
    competencia,
    total: porCompetencia.get(competencia)?.total ?? 0,
    quantidade: porCompetencia.get(competencia)?.quantidade ?? 0,
  }));

  return (
    <AdminPanel
      usuarios={usuarios}
      pagamentos={listaPagamentos}
      rotas={listaRotas}
      faturamento={faturamento}
      config={config ?? { id: true, codigo_min_digitos: 4, codigo_max_digitos: 20, updated_at: "" }}
      meuId={sessao.userId}
      podeCriarConta={temServiceRole()}
      // A tabela de pagamentos vem da migration 0002; sem ela o painel abre
      // igual, só sem o módulo financeiro.
      migracaoPendente={Boolean(erroPagamentos)}
      ultimaLimpeza={ultimaLimpeza ?? null}
    />
  );
}
