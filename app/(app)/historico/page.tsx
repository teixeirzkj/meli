import Link from "next/link";
import { getSessao } from "@/lib/auth";
import { comResumo } from "@/lib/data";
import { RotaCard } from "@/components/RotaCard";
import type { Rota } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS = [
  { valor: "todos", label: "Todos os status" },
  { valor: "em_conferencia", label: "Em conferência" },
  { valor: "finalizada", label: "Finalizada" },
] as const;

const RESULTADO = [
  { valor: "todos", label: "Resultado completo" },
  { valor: "faltantes", label: "Com faltantes" },
  { valor: "excedentes", label: "Com excedentes" },
] as const;

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; resultado?: string }>;
}) {
  const { status = "todos", resultado = "todos" } = await searchParams;
  const { supabase, userId } = (await getSessao())!;

  let query = supabase
    .from("rotas")
    .select("*")
    .eq("user_id", userId)
    .order("data_rota", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(100);

  if (status === "em_conferencia" || status === "finalizada") {
    query = query.eq("status", status);
  }

  const { data: rotas } = await query;
  let lista = await comResumo(supabase, (rotas ?? []) as Rota[]);

  if (resultado === "faltantes") lista = lista.filter((r) => r.faltantes > 0);
  if (resultado === "excedentes") lista = lista.filter((r) => r.excedentes > 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-[19px] font-bold text-navy">Histórico</h1>

      <form className="flex gap-2">
        <Select nome="status" valor={status} opcoes={STATUS} />
        <Select nome="resultado" valor={resultado} opcoes={RESULTADO} />
        <button
          type="submit"
          className="rounded-xl border border-navy px-3.5 py-2.5 text-[13px] font-semibold text-navy"
        >
          Filtrar
        </button>
      </form>

      {lista.length === 0 ? (
        <div className="card p-6 text-center">
          <p className="text-[14px] text-muted">Nenhuma rota registrada.</p>
          <Link
            href="/rotas/nova"
            className="mt-4 inline-block rounded-xl bg-yellow px-5 py-2.5 font-display text-[14px] font-bold text-navy-ink"
          >
            Nova rota
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {lista.map((rota) => (
            <RotaCard key={rota.id} rota={rota} />
          ))}
        </div>
      )}
    </div>
  );
}

function Select({
  nome,
  valor,
  opcoes,
}: {
  nome: string;
  valor: string;
  opcoes: readonly { valor: string; label: string }[];
}) {
  return (
    <select
      name={nome}
      defaultValue={valor}
      className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3 py-2.5 text-[13px] text-navy-ink outline-none focus:border-navy"
    >
      {opcoes.map((o) => (
        <option key={o.valor} value={o.valor}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
