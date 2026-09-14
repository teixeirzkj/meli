"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { mesCurto, moeda, moedaCurta } from "@/lib/format";
import type { MesFaturamento } from "@/lib/types";

/**
 * Série única (faturamento por competência) — por isso não tem legenda: o
 * título já diz o que a barra é. O último mês é o que ainda está correndo e
 * aparece em tom mais claro, com rótulo próprio, para não ser lido como queda.
 */
export function FaturamentoChart({ dados }: { dados: MesFaturamento[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);

  const maximo = Math.max(...dados.map((d) => d.total), 1);
  const atual = dados[dados.length - 1];
  const anterior = dados[dados.length - 2];
  const variacao =
    anterior && anterior.total > 0
      ? ((atual.total - anterior.total) / anterior.total) * 100
      : null;

  return (
    <section className="card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-display text-[15px] font-bold text-navy">
            Faturamento por mês
          </h2>
          <p className="mt-0.5 text-[12px] text-muted">Últimos 6 meses</p>
        </div>

        <div className="text-right">
          <p className="font-display text-[26px] font-bold leading-none tracking-tight text-navy-ink">
            {moedaCurta(atual.total)}
          </p>
          <p className="mt-1 text-[11.5px] text-muted">
            {atual.quantidade} {atual.quantidade === 1 ? "pagamento" : "pagamentos"} em{" "}
            {mesCurto(atual.competencia)}
            {variacao !== null && (
              <span
                className={`ml-1.5 font-semibold ${
                  variacao >= 0 ? "text-success" : "text-danger"
                }`}
              >
                {variacao >= 0 ? "↑" : "↓"} {Math.abs(variacao).toFixed(0)}%
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="relative mt-5">
        <div className="flex h-[132px] items-end gap-2">
          {dados.map((mes, i) => {
            const emAndamento = i === dados.length - 1;
            const altura = Math.max((mes.total / maximo) * 100, mes.total > 0 ? 4 : 1.5);

            return (
              <div
                key={mes.competencia}
                className="group relative flex h-full flex-1 flex-col justify-end"
                onMouseEnter={() => setAtivo(i)}
                onMouseLeave={() => setAtivo(null)}
                onFocus={() => setAtivo(i)}
                onBlur={() => setAtivo(null)}
                tabIndex={0}
              >
                <AnimatePresence>
                  {ativo === i && mes.total > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-navy-ink px-2.5 py-1.5 text-[11.5px] font-semibold text-white shadow-lg"
                    >
                      {moeda(mes.total)}
                      <span className="ml-1.5 font-normal opacity-70">
                        {mes.quantidade}×
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{
                    delay: 0.04 * i,
                    type: "spring",
                    stiffness: 260,
                    damping: 26,
                  }}
                  style={{ height: `${altura}%`, transformOrigin: "bottom" }}
                  className={`w-full rounded-t-[4px] transition-colors ${
                    mes.total === 0
                      ? "bg-line"
                      : emAndamento
                        ? "bg-navy/45 group-hover:bg-navy/60"
                        : "bg-navy group-hover:bg-navy-soft"
                  }`}
                />
              </div>
            );
          })}
        </div>

        <div className="mt-2 flex gap-2 border-t border-line-soft pt-2">
          {dados.map((mes, i) => (
            <p
              key={mes.competencia}
              className={`flex-1 text-center text-[11px] tabular-nums ${
                i === dados.length - 1 ? "font-semibold text-navy" : "text-muted"
              }`}
            >
              {mesCurto(mes.competencia)}
            </p>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[11.5px] text-muted">
        A barra mais clara é o mês em andamento — ainda pode subir.
      </p>

      {/* Mesma informação em texto, para leitor de tela e para quem não
          distingue as barras. */}
      <table className="sr-only">
        <caption>Faturamento por mês</caption>
        <thead>
          <tr>
            <th>Mês</th>
            <th>Total</th>
            <th>Pagamentos</th>
          </tr>
        </thead>
        <tbody>
          {dados.map((mes) => (
            <tr key={mes.competencia}>
              <td>{mesCurto(mes.competencia)}</td>
              <td>{moeda(mes.total)}</td>
              <td>{mes.quantidade}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
