import Link from "next/link";
import { formatData } from "@/lib/format";
import type { RotaResumo } from "@/lib/types";

export function RotaCard({ rota }: { rota: RotaResumo }) {
  const finalizada = rota.status === "finalizada";
  const completa = rota.faltantes === 0 && rota.excedentes === 0;

  return (
    <Link
      href={`/rotas/${rota.id}`}
      className="card block p-4 transition hover:border-navy"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-[16px] font-bold text-navy-ink">
            {rota.nome}
          </p>
          <p className="mt-0.5 text-[12.5px] text-muted">{formatData(rota.data_rota)}</p>
        </div>
        <span
          className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${
            finalizada
              ? completa
                ? "bg-success-bg text-success"
                : "bg-danger-bg text-danger"
              : "bg-warn-bg text-warn"
          }`}
        >
          {finalizada ? (completa ? "Completa" : "Com pendências") : "Em conferência"}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-4 text-[12.5px] tabular-nums">
        <span className="text-muted">
          Esperados <b className="text-navy-ink">{rota.qtd_esperada}</b>
        </span>
        <span className="text-muted">
          Conferidos <b className="text-success">{rota.conferidos}</b>
        </span>
        {rota.faltantes > 0 && (
          <span className="text-muted">
            Faltam <b className="text-danger">{rota.faltantes}</b>
          </span>
        )}
        {rota.excedentes > 0 && (
          <span className="text-muted">
            Excedentes <b className="text-warn">{rota.excedentes}</b>
          </span>
        )}
      </div>
    </Link>
  );
}
