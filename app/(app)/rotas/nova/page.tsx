import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hoje } from "@/lib/format";

export default async function NovaRotaPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  async function criar(formData: FormData) {
    "use server";

    const nome = String(formData.get("nome") ?? "").trim();
    const qtd = Number(formData.get("qtd_esperada"));
    const data = String(formData.get("data_rota") ?? "");

    if (!nome || !Number.isInteger(qtd) || qtd < 1 || !data) {
      redirect("/rotas/nova?erro=Preencha+todos+os+campos+corretamente.");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: rota, error } = await supabase
      .from("rotas")
      .insert({ user_id: user!.id, nome, qtd_esperada: qtd, data_rota: data })
      .select("id")
      .single();

    if (error || !rota) {
      redirect(`/rotas/nova?erro=${encodeURIComponent(error?.message ?? "Erro ao criar a rota.")}`);
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
            placeholder="Ex.: Rota 42 — Centro"
            className="rounded-xl border border-line bg-surface-alt px-3.5 py-3 text-[15px] outline-none focus:border-navy"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-navy-ink">Quantidade esperada</span>
          <input
            name="qtd_esperada"
            type="number"
            inputMode="numeric"
            min={1}
            required
            placeholder="Ex.: 120"
            className="rounded-xl border border-line bg-surface-alt px-3.5 py-3 text-[15px] tabular-nums outline-none focus:border-navy"
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

        <button
          type="submit"
          className="rounded-xl bg-yellow px-4 py-3.5 font-display text-[15px] font-bold text-navy-ink transition hover:bg-yellow-soft"
        >
          Criar rota
        </button>
      </form>
    </div>
  );
}
