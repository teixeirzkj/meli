import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { comResumo } from "@/lib/data";
import { hoje } from "@/lib/format";
import { Stat } from "@/components/Stat";
import { RotaCard } from "@/components/RotaCard";
import type { Rota } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rotas } = await supabase
    .from("rotas")
    .select("*")
    .eq("user_id", user!.id)
    .order("data_rota", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(20);

  const lista = await comResumo(supabase, (rotas ?? []) as Rota[]);
  const doDia = lista.filter((r) => r.data_rota === hoje());

  const esperados = doDia.reduce((s, r) => s + r.qtd_esperada, 0);
  const conferidos = doDia.reduce((s, r) => s + r.conferidos, 0);
  const faltantes = doDia.reduce((s, r) => s + r.faltantes, 0);

  if (lista.length === 0) {
    return (
      <div className="card mt-6 p-6 text-center">
        <h1 className="font-display text-[18px] font-bold text-navy">
          Nenhuma rota criada ainda.
        </h1>
        <p className="mt-2 text-[14px] text-muted">
          Crie uma rota para começar a conferir os pacotes.
        </p>
        <Link
          href="/rotas/nova"
          className="mt-5 inline-block rounded-xl bg-yellow px-5 py-3 font-display text-[15px] font-bold text-navy-ink transition hover:bg-yellow-soft"
        >
          Criar primeira rota
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h1 className="font-display text-[19px] font-bold text-navy">Rotas de hoje</h1>
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Stat label="Rotas de hoje" valor={doDia.length} />
          <Stat label="Pacotes esperados" valor={esperados} />
          <Stat label="Pacotes conferidos" valor={conferidos} tom="ok" />
          <Stat
            label="Pacotes faltantes"
            valor={faltantes}
            tom={faltantes > 0 ? "erro" : "ok"}
          />
        </div>
      </section>

      <Link
        href="/rotas/nova"
        className="rounded-xl bg-yellow px-4 py-3.5 text-center font-display text-[15px] font-bold text-navy-ink transition hover:bg-yellow-soft"
      >
        Nova rota
      </Link>

      <section>
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="font-display text-[16px] font-bold text-navy">Rotas recentes</h2>
          <Link href="/historico" className="text-[13px] font-semibold text-navy hover:underline">
            Ver histórico
          </Link>
        </div>
        <div className="flex flex-col gap-2.5">
          {lista.slice(0, 8).map((rota) => (
            <RotaCard key={rota.id} rota={rota} />
          ))}
        </div>
      </section>
    </div>
  );
}
