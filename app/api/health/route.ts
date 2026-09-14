import { NextResponse } from "next/server";
import { envConfigurado, variaveisFaltando } from "@/lib/supabase/env";
import { temServiceRole } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Diagnóstico de deploy: diz qual commit está no ar e se as env vars chegaram
 * no build. Fica fora do matcher do middleware para responder mesmo quando o
 * middleware está quebrado. Não devolve valor de chave nenhuma.
 */
export async function GET() {
  return NextResponse.json({
    ok: envConfigurado(),
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    ambiente: process.env.VERCEL_ENV ?? "local",
    envFaltando: variaveisFaltando(),
    // Só o fato de existir — nunca o valor.
    podeCriarConta: temServiceRole(),
    supabaseHost: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
      : null,
  });
}
