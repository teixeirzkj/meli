"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/Logo";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setAviso(null);
    setCarregando(true);

    const supabase = createClient();

    if (modo === "criar") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { nome: nome || email.split("@")[0] } },
      });
      setCarregando(false);

      if (error) {
        setErro(traduzErro(error.message));
        return;
      }
      if (!data.session) {
        setAviso("Conta criada. Confirme o e-mail para entrar.");
        setModo("entrar");
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      });
      setCarregando(false);

      if (error) {
        setErro(traduzErro(error.message));
        return;
      }
    }

    const destino = searchParams.get("next") || "/";
    router.replace(destino);
    router.refresh();
  }

  return (
    <div className="w-full max-w-[380px]">
      <div className="flex flex-col items-center">
        <Logo size={128} />
        <h1 className="mt-4 font-display text-[28px] font-bold text-navy">
          {modo === "entrar" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="mt-1 text-[14px] text-muted">Conferência de rotas e pacotes</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="card mt-6 flex flex-col gap-4 p-5"
        noValidate
      >
        {modo === "criar" && (
          <Campo
            label="Nome"
            value={nome}
            onChange={setNome}
            type="text"
            placeholder="Seu nome"
            autoComplete="name"
          />
        )}

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
          autoComplete={modo === "entrar" ? "current-password" : "new-password"}
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

        {aviso && (
          <p
            role="status"
            className="animate-fb-in rounded-lg border border-warn-line bg-warn-bg px-3 py-2 text-[13px] font-medium text-warn"
          >
            {aviso}
          </p>
        )}

        <button
          type="submit"
          disabled={carregando}
          className="rounded-xl bg-yellow px-4 py-3.5 font-display text-[15px] font-bold text-navy-ink transition hover:bg-yellow-soft disabled:opacity-60"
        >
          {carregando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setModo(modo === "entrar" ? "criar" : "entrar");
          setErro(null);
          setAviso(null);
        }}
        className="mt-4 w-full text-center text-[13.5px] font-medium text-navy underline-offset-2 hover:underline"
      >
        {modo === "entrar" ? "Criar uma conta" : "Já tenho conta — entrar"}
      </button>
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
  if (m.includes("email not confirmed")) return "Confirme seu e-mail antes de entrar.";
  if (m.includes("user already registered")) return "Esse e-mail já tem conta.";
  if (m.includes("password should be")) return "A senha precisa de pelo menos 6 caracteres.";
  if (m.includes("rate limit") || m.includes("too many"))
    return "Muitas tentativas. Aguarde um pouco.";
  return msg;
}
