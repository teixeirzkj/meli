import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * Cliente com service_role: ignora RLS e pode mexer no Auth (criar e apagar
 * usuário). Só existe aqui porque criar conta com e-mail e senha não é
 * possível de outro jeito.
 *
 * A chave NÃO tem prefixo NEXT_PUBLIC_, então nunca entra no bundle do
 * navegador. Use apenas dentro de server actions / route handlers, sempre
 * depois de confirmar que quem chamou é administrador.
 */
export function createAdminClient() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada — necessária para criar e remover contas.",
    );
  }

  return createClient(SUPABASE_URL!, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function temServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
