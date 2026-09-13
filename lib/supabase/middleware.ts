import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { SUPABASE_ANON_KEY, SUPABASE_URL, envConfigurado } from "./env";

const PUBLIC_PATHS = ["/login", "/auth"];

export async function updateSession(request: NextRequest) {
  // Sem as chaves não dá para validar sessão nenhuma: deixa passar e quem
  // renderiza a página avisa o que falta, em vez de derrubar o middleware.
  if (!envConfigurado()) return NextResponse.next({ request });

  try {
    return await verificarSessao(request);
  } catch (erro) {
    // Middleware que estoura vira MIDDLEWARE_INVOCATION_FAILED: a Vercel
    // devolve 500 em todas as rotas e engole a causa. Melhor seguir adiante —
    // o layout de (app) refaz a checagem de sessão no servidor e redireciona.
    console.error("[middleware] falhou, seguindo sem checar sessão:", erro);
    return NextResponse.next({ request });
  }
}

async function verificarSessao(request: NextRequest) {
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

  // Não remover: revalida o token e mantém os cookies em dia.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
