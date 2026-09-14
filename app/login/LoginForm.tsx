"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";
import { WHATSAPP_CONTRATACAO } from "@/lib/contato";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });

    if (error) {
      setCarregando(false);
      setErro(traduzErro(error.message));
      return;
    }

    router.replace(searchParams.get("next") || "/");
    router.refresh();
  }

  return (
    // Sem framer-motion aqui de propósito: o login é a primeira tela que
    // carrega e a biblioteca custaria ~40kB de JS logo na entrada.
    <div className="w-full max-w-[380px] animate-pop-in">
      <div className="flex flex-col items-center">
        <Logo size={128} />
        <h1 className="mt-4 font-display text-[28px] font-bold text-navy">Entrar</h1>
        <p className="mt-1 text-[14px] text-muted">Conferência de rotas e pacotes</p>
      </div>

      <form onSubmit={onSubmit} className="card mt-6 flex flex-col gap-4 p-5" noValidate>
        <Campo
          label="E-mail"
          value={email}
          onChange={setEmail}
          type="email"
          placeholder="voce@empresa.com"
          autoComplete="email"
          required
        />

        <Campo
          label="Senha"
          value={senha}
          onChange={setSenha}
          type="password"
          placeholder="••••••"
          autoComplete="current-password"
          required
        />

        {erro && (
          <p
            role="alert"
            className="animate-fb-in rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger"
          >
            {erro}
          </p>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="rounded-xl bg-yellow px-4 py-3.5 font-display text-[15px] font-bold text-navy-ink transition hover:bg-yellow-soft disabled:opacity-60"
        >
          {carregando ? "Entrando…" : "Entrar"}
        </button>
      </form>

      {/* Não existe autocadastro: a contratação passa pelo WhatsApp e a conta
          é criada no painel administrativo. */}
      <div className="mt-5 text-center">
        <p className="text-[13px] text-muted">Ainda não tem acesso?</p>
        <a
          href={WHATSAPP_CONTRATACAO}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-2 rounded-xl border border-line bg-white px-4 py-2.5 font-display text-[13.5px] font-bold text-navy transition hover:border-navy"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.87 9.87 0 0 0 4.74 1.21h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.18 8.18 0 0 1-1.26-4.38c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.24-.64.8-.78.97-.15.16-.29.18-.54.06-.25-.13-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.01-.38.11-.5.11-.11.25-.29.37-.43.13-.15.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.87.85-.87 2.07 0 1.22.89 2.4 1.02 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.11-.22-.17-.47-.29z" />
          </svg>
          Falar no WhatsApp
        </a>
        <p className="mt-2 text-[11.5px] text-muted">
          A contratação é feita por lá e a conta é liberada na hora.
        </p>
      </div>
    </div>
  );
}

function Campo({
  label,
  value,
  onChange,
  ...props
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value">) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-navy-ink">{label}</span>
      <input
        {...props}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-line bg-surface-alt px-3.5 py-3 text-[15px] text-navy-ink outline-none transition placeholder:text-[#94a0b4] focus:border-navy"
      />
    </label>
  );
}

function traduzErro(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "E-mail ou senha incorretos.";
  if (m.includes("email not confirmed")) return "Conta ainda não confirmada — fale com o administrador.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde um pouco.";
  return msg;
}
