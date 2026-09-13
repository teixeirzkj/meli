/**
 * As duas variáveis são embutidas no bundle em tempo de build. Faltando uma,
 * o createServerClient estoura dentro do middleware e a Vercel devolve
 * MIDDLEWARE_INVOCATION_FAILED — 500 sem explicação nenhuma. Por isso o app
 * checa antes e mostra o que está faltando.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function envConfigurado(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function variaveisFaltando(): string[] {
  const faltando: string[] = [];
  if (!SUPABASE_URL) faltando.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_ANON_KEY) faltando.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return faltando;
}
