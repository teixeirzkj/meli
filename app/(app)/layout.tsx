import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { BottomNav } from "@/components/BottomNav";
import { Header } from "@/components/Header";
import { EnvFaltando } from "@/components/EnvFaltando";
import { envConfigurado } from "@/lib/supabase/env";
import { formatData, diasRestantes } from "@/lib/format";
import { WHATSAPP_EXIBICAO, WHATSAPP_RENOVACAO } from "@/lib/contato";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!envConfigurado()) return <EnvFaltando />;

  // Checagem autoritativa da sessão: o middleware só olha o cookie, quem
  // valida o token com o Supabase é aqui.
  const sessao = await getSessao();
  if (!sessao) redirect("/login");

  const { profile } = sessao;

  if (!profile) {
    return (
      <Bloqueio
        titulo="Conta sem perfil"
        texto="Rode as migrations do Supabase — o profile é criado por trigger no cadastro."
      />
    );
  }

  const isAdmin = profile.tipo === "admin";
  const dias = diasRestantes(profile.assinatura_fim);

  // Admin nunca é barrado: senão ninguém consegue reativar ninguém.
  if (!isAdmin) {
    if (profile.status === "bloqueado") {
      return (
        <Bloqueio
          titulo="Acesso bloqueado"
          texto="Sua conta foi bloqueada pelo administrador. Fale com a gente para entender o que houve."
          mostrarWhatsapp
        />
      );
    }

    if (profile.status === "suspenso") {
      return (
        <Bloqueio
          titulo="Conta suspensa"
          texto="Seu acesso está pausado no momento. A gente reativa assim que resolver a pendência."
          mostrarWhatsapp
        />
      );
    }

    if (dias < 0) {
      return (
        <Bloqueio
          titulo="Assinatura vencida"
          texto={`Sua assinatura venceu em ${formatData(profile.assinatura_fim)}. Renove para voltar a conferir rotas.`}
          mostrarWhatsapp
        />
      );
    }
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <Header nome={profile.nome} isAdmin={isAdmin} />
      <main className="mx-auto w-full max-w-[560px] flex-1 px-4 py-4">{children}</main>
      <BottomNav isAdmin={isAdmin} />
    </div>
  );
}

function Bloqueio({
  titulo,
  texto,
  mostrarWhatsapp = false,
}: {
  titulo: string;
  texto: string;
  mostrarWhatsapp?: boolean;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="card w-full max-w-[400px] p-6 text-center">
        <h1 className="font-display text-[20px] font-bold text-navy">{titulo}</h1>
        <p className="mt-2 text-[14px] text-muted">{texto}</p>

        {mostrarWhatsapp && (
          <>
            <a
              href={WHATSAPP_RENOVACAO}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 block rounded-xl bg-yellow px-4 py-3 font-display text-[15px] font-bold text-navy-ink transition hover:bg-yellow-soft"
            >
              Falar no WhatsApp
            </a>
            <p className="mt-2 text-[12px] text-muted">{WHATSAPP_EXIBICAO}</p>
          </>
        )}

        <form action="/auth/signout" method="post" className="mt-4">
          <button
            type="submit"
            className="w-full rounded-xl border border-line px-4 py-2.5 font-display text-[13.5px] font-bold text-navy"
          >
            Sair da conta
          </button>
        </form>
      </div>
    </main>
  );
}
