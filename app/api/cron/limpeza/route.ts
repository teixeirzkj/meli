import { NextResponse } from "next/server";
import { createAdminClient, temServiceRole } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Rede de segurança do expurgo: a limpeza é agendada no próprio Postgres
 * (pg_cron, migration 0003) e esta rota chama a mesma função. Se o pg_cron
 * estiver desligado, o cron da Vercel mantém a faxina em dia; se estiver
 * ligado, esta execução simplesmente não encontra nada para apagar.
 *
 * A Vercel manda "Authorization: Bearer $CRON_SECRET" quando a variável
 * existe. Sem ela configurada, a rota recusa qualquer chamada — não vale a
 * pena deixar um endpoint que apaga dados aberto para a internet.
 */
export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET;

  if (!segredo) {
    return NextResponse.json(
      { ok: false, erro: "CRON_SECRET não configurada." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ ok: false, erro: "Não autorizado." }, { status: 401 });
  }

  if (!temServiceRole()) {
    return NextResponse.json(
      { ok: false, erro: "SUPABASE_SERVICE_ROLE_KEY não configurada." },
      { status: 503 },
    );
  }

  const { data, error } = await createAdminClient().rpc("limpar_rotas_antigas");

  if (error) {
    return NextResponse.json({ ok: false, erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, rotasRemovidas: data ?? 0 });
}
