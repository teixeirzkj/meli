import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessao } from "@/lib/auth";
import { hoje } from "@/lib/format";
import { BotaoSubmit } from "@/components/BotaoSubmit";

export default async function NovaRotaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  async function criar(formData: FormData) {
    "use server";

    const nome = String(formData.get("nome") ?? "").trim();
    const data = String(formData.get("data_rota") ?? "");

    if (!nome || !data) {
      redirect("/rotas/nova?erro=Preencha+todos+os+campos+corretamente.");
    }

    const sessao = await getSessao();
    if (!sessao) redirect("/login");

    const { data: rota, error } = await sessao.supabase
      .from("rotas")
      // Sem quantidade: ela é declarada ao finalizar, depois de conferir.
      .insert({ user_id: sessao.userId, nome, data_rota: data })
      .select("id")
      .single();

    if (error || !rota) {
      // 23502 = not-null violation. Enquanto a migration 0004 não roda, o banco
      // ainda exige a quantidade que esta tela deixou de pedir.
      const mensagem =
        error?.code === "23502" && error.message.includes("qtd_esperada")
          ? "O banco ainda exige a quantidade na criação. Rode a migration 0004_quantidade_no_fim.sql no Supabase."
          : (error?.message ?? "Erro ao criar a rota.");

      redirect(`/rotas/nova?erro=${encodeURIComponent(mensagem)}`);
    }

    redirect(`/rotas/${rota.id}`);
  }

  return (
    <div>
      <Link href="/" className="text-[13.5px] font-semibold text-navy hover:underline">
        ← Voltar
      </Link>

      <h1 className="mt-3 font-display text-[19px] font-bold text-navy">Nova rota</h1>

      <form action={criar} className="card mt-4 flex flex-col gap-4 p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-navy-ink">Nome da rota</span>
          <input
            name="nome"
            required
            maxLength={80}
            autoFocus
            placeholder="Ex.: Rota 42 — Centro"
            className="rounded-xl border border-line bg-surface-alt px-3.5 py-3 text-[15px] outline-none focus:border-navy"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-navy-ink">Data da rota</span>
          <input
            name="data_rota"
            type="date"
            required
            defaultValue={hoje()}
            className="rounded-xl border border-line bg-surface-alt px-3.5 py-3 text-[15px] outline-none focus:border-navy"
          />
        </label>

        {erro && (
          <p className="rounded-lg border border-danger-line bg-danger-bg px-3 py-2 text-[13px] font-medium text-danger">
            {erro}
          </p>
        )}

        <p className="rounded-lg border border-line bg-surface-alt px-3 py-2.5 text-[12px] leading-relaxed text-muted">
          A quantidade esperada é informada no fim, quando você terminar de bipar —
          é aí que dá para saber se faltou ou sobrou pacote.
        </p>

        <BotaoSubmit pendenteLabel="Criando rota…">Criar rota</BotaoSubmit>
      </form>
    </div>
  );
}
