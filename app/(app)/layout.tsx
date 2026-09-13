import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { formatData, diasRestantes } from "@/lib/format";
import type { Profile } from "@/lib/types";
import { EnvFaltando } from "@/components/EnvFaltando";
import { envConfigurado } from "@/lib/supabase/env";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!envConfigurado()) return <EnvFaltando />;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  // Sem profile o app não tem como aplicar assinatura nem permissões.
  if (!profile) {
    return (
      <Aviso
        titulo="Conta sem perfil"
        texto="Rode a migration 0001_init.sql no Supabase — o profile é criado por trigger no cadastro."
      />
    );
  }

  const isAdmin = profile.tipo === "admin";
  const vencida = !isAdmin && diasRestantes(profile.assinatura_fim) < 0;

  if (vencida) {
    return (
      <Aviso
        titulo="Assinatura vencida"
        texto={`Sua assinatura venceu em ${formatData(profile.assinatura_fim)}. Fale com o administrador para renovar.`}
      />
    );
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header nome={profile.nome} isAdmin={isAdmin} />
      <main className="mx-auto w-full max-w-[560px] flex-1 px-4 py-4">{children}</main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="card w-full max-w-[380px] p-6 text-center">
        <h1 className="font-display text-[20px] font-bold text-navy">{titulo}</h1>
        <p className="mt-2 text-[14px] text-muted">{texto}</p>
        <form action="/auth/signout" method="post" className="mt-5">
          <button
            type="submit"
            className="w-full rounded-xl bg-yellow px-4 py-3 font-display text-[15px] font-bold text-navy-ink"
          >
            Voltar ao login
          </button>
        </form>
      </div>
    </main>
  );
}
