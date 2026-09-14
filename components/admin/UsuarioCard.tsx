"use client";

import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import { Botao, Selo } from "@/components/ui";
import { diasRestantes, formatData, moeda } from "@/lib/format";
import { definirStatus, definirTipo, renovarAssinatura } from "@/app/(app)/admin/actions";
import type { StatusConta, UsuarioAdmin } from "@/lib/types";

export function UsuarioCard({
  usuario,
  ehVoce,
  indice,
  onPagamento,
  onExcluir,
  onFeedback,
}: {
  usuario: UsuarioAdmin;
  ehVoce: boolean;
  indice: number;
  onPagamento: () => void;
  onExcluir: () => void;
  onFeedback: (tom: "ok" | "erro", msg: string) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [pendente, iniciar] = useTransition();

  const dias = diasRestantes(usuario.assinatura_fim);
  const vencida = dias < 0;
  const semAcesso = usuario.status !== "ativo" || vencida;

  function executar(fn: () => Promise<{ ok: boolean; erro?: string }>, sucesso: string) {
    iniciar(async () => {
      const r = await fn();
      onFeedback(r.ok ? "ok" : "erro", r.ok ? sucesso : r.erro!);
    });
  }

  const mudarStatus = (status: StatusConta, msg: string) =>
    executar(() => definirStatus(usuario.id, status), msg);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(indice, 8) * 0.035, duration: 0.22 }}
      className="card overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-display text-[15px] font-bold text-navy-ink">
              {usuario.nome || usuario.email}
              {ehVoce && <span className="ml-1.5 text-[11.5px] text-muted">(você)</span>}
            </p>
            <p className="truncate text-[12px] text-muted">{usuario.email}</p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-1.5">
            {usuario.tipo === "admin" && <Selo tom="info">admin</Selo>}
            {usuario.status === "suspenso" && <Selo tom="alerta">suspenso</Selo>}
            {usuario.status === "bloqueado" && <Selo tom="erro">bloqueado</Selo>}
            {usuario.status === "ativo" && vencida && <Selo tom="erro">vencida</Selo>}
            {usuario.status === "ativo" && !vencida && dias <= 7 && (
              <Selo tom="alerta">{dias}d</Selo>
            )}
          </div>
        </div>

        <dl className="mt-3 grid grid-cols-3 gap-2 text-[11.5px]">
          <div>
            <dt className="text-muted">Vencimento</dt>
            <dd className="font-semibold text-navy-ink">
              {formatData(usuario.assinatura_fim)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Pago no total</dt>
            <dd className="font-semibold text-navy-ink tabular-nums">
              {moeda(usuario.totalPago)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Rotas</dt>
            <dd className="font-semibold text-navy-ink tabular-nums">{usuario.rotas}</dd>
          </div>
        </dl>

        <div className="mt-3.5 flex flex-wrap gap-2">
          <Botao
            variante="primario"
            className="!px-3 !py-2 !text-[12.5px]"
            onClick={onPagamento}
          >
            Pagamento
          </Botao>

          <Botao
            variante="secundario"
            className="!px-3 !py-2 !text-[12.5px]"
            disabled={pendente}
            onClick={() =>
              executar(() => renovarAssinatura(usuario.id, 30), "Assinatura renovada em 30 dias.")
            }
          >
            + 30 dias
          </Botao>

          <Botao
            variante="fantasma"
            className="!px-3 !py-2 !text-[12.5px]"
            onClick={() => setAberto((v) => !v)}
            aria-expanded={aberto}
          >
            {aberto ? "Menos" : "Mais"}
          </Botao>
        </div>
      </div>

      {aberto && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden border-t border-line-soft bg-surface-alt"
        >
          <div className="flex flex-col gap-3 p-4">
            <div className="grid grid-cols-2 gap-2 text-[11.5px]">
              <p className="text-muted">
                Situação:{" "}
                <b className={semAcesso ? "text-danger" : "text-success"}>
                  {semAcesso ? "sem acesso ao app" : "com acesso"}
                </b>
              </p>
              <p className="text-muted">
                Pagamentos: <b className="text-navy-ink">{usuario.pagamentos}</b>
              </p>
              <p className="text-muted">
                Último pagamento:{" "}
                <b className="text-navy-ink">{formatData(usuario.ultimoPagamento)}</b>
              </p>
              <p className="text-muted">
                Desde: <b className="text-navy-ink">{formatData(usuario.created_at)}</b>
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {usuario.status !== "ativo" ? (
                <Botao
                  variante="secundario"
                  className="!px-3 !py-2 !text-[12.5px]"
                  disabled={pendente}
                  onClick={() => mudarStatus("ativo", "Acesso reativado.")}
                >
                  Reativar
                </Botao>
              ) : (
                <Botao
                  variante="secundario"
                  className="!px-3 !py-2 !text-[12.5px]"
                  disabled={pendente || ehVoce}
                  onClick={() => mudarStatus("suspenso", "Conta suspensa.")}
                >
                  Suspender
                </Botao>
              )}

              <Botao
                variante="perigo"
                className="!px-3 !py-2 !text-[12.5px]"
                disabled={pendente || ehVoce || usuario.status === "bloqueado"}
                onClick={() => mudarStatus("bloqueado", "Conta bloqueada.")}
              >
                Bloquear
              </Botao>

              <Botao
                variante="secundario"
                className="!px-3 !py-2 !text-[12.5px]"
                disabled={pendente || ehVoce}
                onClick={() =>
                  executar(
                    () => definirTipo(usuario.id, usuario.tipo === "admin" ? "user" : "admin"),
                    usuario.tipo === "admin"
                      ? "Agora é usuário comum."
                      : "Agora é administrador.",
                  )
                }
              >
                {usuario.tipo === "admin" ? "Tirar admin" : "Tornar admin"}
              </Botao>

              <Botao
                variante="perigo"
                className="!px-3 !py-2 !text-[12.5px]"
                disabled={pendente || ehVoce}
                onClick={onExcluir}
              >
                Excluir conta
              </Botao>
            </div>

            <p className="text-[11px] text-muted">
              <b>Suspenso</b> pausa o acesso e é reversível; <b>bloqueado</b> corta o acesso
              até você reativar. Nos dois casos os dados ficam guardados — só a exclusão apaga.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
