import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /*
   * Tudo, menos os assets do Next, os estáticos de /public e o /api/health —
   * que precisa responder justamente quando o middleware está com problema.
   * Só exclusão por prefixo: filtrar por extensão exigiria escapar o ponto,
   * e um "." solto aqui derruba rotas legítimas do matcher.
   */
  matcher: ["/((?!_next|api/health|api/cron|prototipos|favicon.ico|logo-rotas.png).*)"],
};
