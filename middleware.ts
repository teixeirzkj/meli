import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /*
   * Tudo, menos os assets do Next, os estáticos de /public e o /api/health —
   * que precisa responder justamente quando o middleware está com problema.
   *
   * O manifesto, o service worker, os ícones e a página de offline têm de sair
   * daqui: o navegador busca esses arquivos fora do contexto de navegação e,
   * levando redirect para /login, o app simplesmente não fica instalável.
   *
   * Só exclusão por prefixo: filtrar por extensão exigiria escapar o ponto,
   * e um "." solto aqui derruba rotas legítimas do matcher.
   */
  matcher: [
    "/((?!_next|api/health|api/cron|prototipos|icons|sw.js|manifest.webmanifest|offline.html|favicon.ico|logo-rotas.png).*)",
  ],
};
