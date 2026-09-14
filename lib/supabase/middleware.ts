import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, envConfigurado } from "./env";
import { cookiesDeSessao, lerSessaoDoCookie } from "./sessao-cookie";

const PUBLIC_PATHS = ["/login", "/auth"];

/** Renova o token com esta antecedência (ms) antes de ele expirar. */
const MARGEM_RENOVACAO = 2 * 60 * 1000;

export async function updateSession(request: NextRequest) {
  if (!envConfigurado()) return NextResponse.next({ request });

  try {
    return await rotear(request);
  } catch (erro) {
    // Middleware que estoura vira MIDDLEWARE_INVOCATION_FAILED: 500 em todas
    // as rotas, sem causa visível. Segue adiante — o layout de (app) refaz a
    // checagem no servidor e redireciona quem não tem sessão válida.
    console.error("[middleware] falhou, seguindo sem checar sessão:", erro);
    return NextResponse.next({ request });
  }
}

async function rotear(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (cookiesDeSessao(request.cookies.getAll()).length === 0) {
    return isPublic ? NextResponse.next({ request }) : paraLogin(request, pathname);
  }

  // Token ainda válido: decide a rota sem nenhuma ida à rede. É o caminho de
  // quase toda requisição — inclusive os prefetch que o Next dispara sozinho.
  const sessao = lerSessaoDoCookie(request.cookies.getAll());
  const precisaRenovar = !sessao || sessao.expiraEm - Date.now() < MARGEM_RENOVACAO;

  if (!precisaRenovar) {
    if (pathname === "/login") return paraInicio(request);
    return NextResponse.next({ request });
  }

  return renovarSessao(request, pathname, isPublic);
}

/** Troca o refresh token e grava os cookies novos na resposta. */
async function renovarSessao(request: NextRequest, pathname: string, isPublic: boolean) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) return paraLogin(request, pathname);
  if (user && pathname === "/login") return paraInicio(request);

  return response;
}

function paraLogin(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

function paraInicio(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}
