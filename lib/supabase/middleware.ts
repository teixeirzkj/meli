import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, envConfigurado } from "./env";

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
  const cookies = cookiesDeSessao(request);

  if (cookies.length === 0) {
    return isPublic ? NextResponse.next({ request }) : paraLogin(request, pathname);
  }

  // Token ainda válido: decide a rota sem nenhuma ida à rede. É o caminho de
  // 99% das requisições — inclusive os prefetch que o Next dispara sozinho.
  if (!precisaRenovar(cookies)) {
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

function cookiesDeSessao(request: NextRequest) {
  return request.cookies
    .getAll()
    .filter((c) => /^sb-.+-auth-token(\.\d+)?$/.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Lê o exp do access token direto do cookie. Não é validação de assinatura —
 * é só para saber se vale a pena gastar uma chamada de rede renovando.
 * Qualquer surpresa no formato cai no true e segue o caminho seguro.
 */
function precisaRenovar(cookies: { value: string }[]): boolean {
  try {
    // O @supabase/ssr grava "base64-" + base64url(JSON), quebrado em pedaços
    // .0/.1 quando passa do tamanho de um cookie.
    let bruto = cookies.map((c) => c.value).join("");
    if (bruto.startsWith("base64-")) bruto = base64UrlDecode(bruto.slice(7));

    const { access_token } = JSON.parse(bruto);
    const payload = JSON.parse(base64UrlDecode(access_token.split(".")[1]));

    return payload.exp * 1000 - Date.now() < MARGEM_RENOVACAO;
  } catch {
    return true;
  }
}

function base64UrlDecode(valor: string): string {
  const base64 = valor.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="));
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
