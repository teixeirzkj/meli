"use client";

import { useEffect, useState, useTransition } from "react";
import { Alerta, Botao, Campo, CAMPO, Dialogo } from "@/components/ui";
import { registrarPagamento } from "@/app/(app)/admin/actions";
import { hoje } from "@/lib/format";
import { METODOS, type MetodoPagamento, type UsuarioAdmin } from "@/lib/types";

export function PagamentoDialogo({
  usuario,
  onFechar,
  onFeedback,
}: {
  usuario: UsuarioAdmin | null;
  onFechar: () => void;
  onFeedback: (tom: "ok" | "erro", msg: string) => void;
}) {
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje());
  const [competencia, setCompetencia] = useState(hoje().slice(0, 7));
  const [metodo, setMetodo] = useState<MetodoPagamento>("pix");
  const [observacao, setObservacao] = useState("");
  const [renovar, setRenovar] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  // Cada usuário abre o formulário limpo.
  useEffect(() => {
    if (usuario) {
      setValor("");
      setData(hoje());
      setCompetencia(hoje().slice(0, 7));
      setMetodo("pix");
      setObservacao("");
      setRenovar(true);
      setErro(null);
    }
  }, [usuario]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!usuario) return;

    const numero = Number(valor.replace(",", "."));
    if (!(numero > 0)) {
      setErro("Informe um valor maior que zero.");
      return;
    }

    setErro(null);

    iniciar(async () => {
      const r = await registrarPagamento({
        userId: usuario.id,
        valor: numero,
        dataPagamento: data,
        competencia: `${competencia}-01`,
        metodo,
        observacao,
        renovarDias: renovar ? 30 : 0,
      });

      if (!r.ok) {
        setErro(r.erro ?? "Não deu para registrar.");
        return;
      }

      onFeedback(
        "ok",
        r.aviso ?? (renovar ? "Pagamento registrado e assinatura renovada." : "Pagamento registrado."),
      );
      onFechar();
    });
  }

  return (
    <Dialogo
      aberto={Boolean(usuario)}
      titulo="Registrar pagamento"
      descricao={usuario ? `${usuario.nome || usuario.email}` : undefined}
      onFechar={onFechar}
    >
      <form onSubmit={enviar} className="flex flex-col gap-3">
        <div className="flex gap-3">
          <Campo label="Valor (R$)">
            <input
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              inputMode="decimal"
              required
              placeholder="99,90"
              className={`${CAMPO} tabular-nums`}
              autoFocus
            />
          </Campo>

          <Campo label="Forma">
            <select
              value={metodo}
              onChange={(e) => setMetodo(e.target.value as MetodoPagamento)}
              className={CAMPO}
            >
              {METODOS.map((m) => (
                <option key={m.valor} value={m.valor}>
                  {m.label}
                </option>
              ))}
            </select>
          </Campo>
        </div>

        <div className="flex gap-3">
          <Campo label="Data do pagamento">
            <input
              value={data}
              onChange={(e) => setData(e.target.value)}
              type="date"
              required
              className={CAMPO}
            />
          </Campo>

          <Campo label="Competência" hint="Mês a que o pagamento se refere.">
            <input
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              type="month"
              required
              className={CAMPO}
            />
          </Campo>
        </div>

        <Campo label="Observação (opcional)">
          <input
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex.: mensalidade de outubro"
            className={CAMPO}
          />
        </Campo>

        <label className="flex items-center gap-2.5 rounded-xl border border-line bg-surface-alt px-3.5 py-2.5">
          <input
            type="checkbox"
            checked={renovar}
            onChange={(e) => setRenovar(e.target.checked)}
            className="size-4 accent-[#12295c]"
          />
          <span className="text-[13px] text-navy-ink">
            Renovar a assinatura em <b>30 dias</b>
          </span>
        </label>

        {erro && <Alerta tom="erro">{erro}</Alerta>}

        <div className="mt-1 flex gap-2">
          <Botao type="button" variante="secundario" className="flex-1" onClick={onFechar}>
            Cancelar
          </Botao>
          <Botao type="submit" className="flex-1" disabled={pendente}>
            {pendente ? "Salvando…" : "Registrar"}
          </Botao>
        </div>
      </form>
    </Dialogo>
  );
}
