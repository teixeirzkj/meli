/**
 * Lê a sessão direto do cookie, sem ida à rede.
 *
 * O @supabase/ssr grava "base64-" + base64url(JSON da sessão), quebrado em
 * pedaços .0/.1 quando passa do tamanho de um cookie.
 *
 * Isto NÃO valida assinatura — e não precisa: o token só vale alguma coisa
 * quando o Postgres o verifica, e é ele quem decide o que cada um enxerga via
 * RLS. Aqui o conteúdo serve para duas decisões baratas: para onde rotear e
 * quando vale a pena gastar uma chamada renovando o token.
 */
export type SessaoCookie = {
  userId: string;
  /** epoch em milissegundos */
  expiraEm: number;
};

const NOME_COOKIE = /^sb-.+-auth-token(\.\d+)?$/;

export function cookiesDeSessao<T extends { name: string }>(cookies: T[]): T[] {
  return cookies
    .filter((c) => NOME_COOKIE.test(c.name))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function lerSessaoDoCookie(
  cookies: { name: string; value: string }[],
): SessaoCookie | null {
  const pedacos = cookiesDeSessao(cookies);
  if (pedacos.length === 0) return null;

  try {
    let bruto = pedacos.map((c) => c.value).join("");
    if (bruto.startsWith("base64-")) bruto = base64UrlDecode(bruto.slice(7));

    const { access_token } = JSON.parse(bruto);
    const payload = JSON.parse(base64UrlDecode(access_token.split(".")[1]));

    if (typeof payload.sub !== "string" || typeof payload.exp !== "number") return null;

    return { userId: payload.sub, expiraEm: payload.exp * 1000 };
  } catch {
    return null;
  }
}

function base64UrlDecode(valor: string): string {
  const base64 = valor.replace(/-/g, "+").replace(/_/g, "/");
  const comPad = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
  return decodeURIComponent(
    atob(comPad)
      .split("")
      .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
      .join(""),
  );
}
