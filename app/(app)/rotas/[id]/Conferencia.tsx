"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatData, resumoRota } from "@/lib/format";
import { Stat } from "@/components/Stat";
import type { AppConfig, Pacote, Rota } from "@/lib/types";

type Feedback = { tom: "ok" | "erro" | "alerta"; msg: string; sub?: string };

export function Conferencia({
  rota: rotaInicial,
  pacotesIniciais,
  config,
}: {
  rota: Rota;
  pacotesIniciais: Pacote[];
  config: AppConfig;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const inputRef = useRef<HTMLInputElement>(null);

  const [rota, setRota] = useState(rotaInicial);
  const [pacotes, setPacotes] = useState(pacotesIniciais);
  const [codigo, setCodigo] = useState("");
  const [parada, setParada] = useState("");
  const [busca, setBusca] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [modalFinalizar, setModalFinalizar] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const finalizada = rota.status === "finalizada";
  const excedentes = pacotes.filter((p) => p.excedente).length;
  const resumo = resumoRota(rota.qtd_esperada, pacotes.length, excedentes);

  const visiveis = busca.trim()
    ? pacotes.filter((p) => p.codigo.toLowerCase().includes(busca.trim().toLowerCase()))
    : pacotes;

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (finalizada || salvando) return;

    const valor = codigo.trim();
    const { codigo_min_digitos: min, codigo_max_digitos: max } = config;

    if (valor.length < min || valor.length > max) {
      return avisar({
        tom: "erro",
        msg: "Código inválido",
        sub: min === max ? `Use ${min} caracteres.` : `Use de ${min} a ${max} caracteres.`,
      });
    }

    if (pacotes.some((p) => p.codigo === valor)) {
      return avisar({ tom: "alerta", msg: "Já conferido", sub: valor });
    }

    // Passou da quantidade esperada: entra como excedente, não some do relatório.
    const validos = pacotes.length - excedentes;
    const isExcedente = validos >= rota.qtd_esperada;

    setSalvando(true);
    const { data, error } = await supabase
      .from("pacotes")
      .insert({
        rota_id: rota.id,
        user_id: rota.user_id,
        codigo: valor,
        parada: parada.trim() || null,
        excedente: isExcedente,
      })
      .select("*")
      .single<Pacote>();
    setSalvando(false);

    if (error || !data) {
      return avisar({ tom: "erro", msg: "Não salvou", sub: error?.message });
    }

    setPacotes((atual) => [data, ...atual]);
    setCodigo("");
    inputRef.current?.focus();
    avisar(
      isExcedente
        ? { tom: "alerta", msg: "Excedente registrado", sub: valor }
        : { tom: "ok", msg: "Pacote conferido", sub: valor },
    );
    router.refresh();
  }

  async function remover(pacote: Pacote) {
    if (finalizada) return;

    const anterior = pacotes;
    setPacotes((atual) => atual.filter((p) => p.id !== pacote.id));

    const { error } = await supabase.from("pacotes").delete().eq("id", pacote.id);
    if (error) {
      setPacotes(anterior);
      avisar({ tom: "erro", msg: "Não removeu", sub: error.message });
      return;
    }
    router.refresh();
  }

  async function finalizar() {
    setSalvando(true);
    const { data, error } = await supabase
      .from("rotas")
      .update({ status: "finalizada", finalizada_em: new Date().toISOString() })
      .eq("id", rota.id)
      .select("*")
      .single<Rota>();
    setSalvando(false);
    setModalFinalizar(false);

    if (error || !data) {
      return avisar({ tom: "erro", msg: "Não finalizou", sub: error?.message });
    }
    setRota(data);
    router.refresh();
  }

  function avisar(fb: Feedback) {
    setFeedback(fb);
    window.setTimeout(() => setFeedback(null), 2600);
  }

  function exportarTxt() {
    const linhas = [
      `ROTA ${rota.nome}`,
      `Data: ${formatData(rota.data_rota)}`,
      `Status: ${finalizada ? "Finalizada" : "Em conferência"}`,
      `Esperados: ${rota.qtd_esperada}`,
      `Conferidos: ${resumo.conferidos}`,
      `Faltantes: ${resumo.faltantes}`,
      `Excedentes: ${resumo.excedentes}`,
      "",
      "CÓDIGO;PARADA;EXCEDENTE",
      ...pacotes.map((p) => `${p.codigo};${p.parada ?? ""};${p.excedente ? "sim" : "nao"}`),
    ];

    const blob = new Blob([linhas.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rota-${rota.nome.replace(/[^\w-]+/g, "-").toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/" className="text-[13.5px] font-semibold text-navy hover:underline">
        ← Voltar
      </Link>

      <header>
        <h1 className="font-display text-[20px] font-bold text-navy">{rota.nome}</h1>
        <p className="mt-0.5 text-[13px] text-muted">
          {formatData(rota.data_rota)} · {finalizada ? "Finalizada" : "Em conferência"}
        </p>
      </header>

      <div className="grid grid-cols-4 gap-2">
        <Stat label="Esperados" valor={rota.qtd_esperada} />
        <Stat label="Conferidos" valor={resumo.conferidos} tom="ok" />
        <Stat
          label="Faltam"
          valor={resumo.faltantes}
          tom={resumo.faltantes > 0 ? "erro" : "ok"}
        />
        <Stat
          label="Excedentes"
          valor={resumo.excedentes}
          tom={resumo.excedentes > 0 ? "alerta" : "neutro"}
        />
      </div>

      {feedback && (
        <p
          role="status"
          className={`animate-fb-in rounded-xl px-3.5 py-2.5 text-[13.5px] font-semibold ${
            feedback.tom === "ok"
              ? "bg-success-bg text-success"
              : feedback.tom === "alerta"
                ? "bg-warn-bg text-warn"
                : "bg-danger-bg text-danger"
          }`}
        >
          {feedback.msg}
          {feedback.sub && (
            <span className="ml-2 font-mono text-[12.5px] font-normal opacity-80">
              {feedback.sub}
            </span>
          )}
        </p>
      )}

      {finalizada ? (
        <p className="card bg-surface-alt px-4 py-3 text-[13.5px] font-medium text-muted">
          Esta rota já foi finalizada.
        </p>
      ) : (
        <form onSubmit={adicionar} className="card flex flex-col gap-3 p-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-navy-ink">Código do pacote</span>
            <input
              ref={inputRef}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              autoFocus
              autoComplete="off"
              placeholder="Bipe ou digite o código"
              className="rounded-xl border border-line bg-surface-alt px-3.5 py-3 font-mono text-[15px] outline-none focus:border-navy"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-navy-ink">Parada (opcional)</span>
            <input
              value={parada}
              onChange={(e) => setParada(e.target.value)}
              autoComplete="off"
              placeholder="Ex.: 12"
              className="rounded-xl border border-line bg-surface-alt px-3.5 py-3 text-[15px] outline-none focus:border-navy"
            />
          </label>

          <button
            type="submit"
            disabled={salvando}
            className="rounded-xl bg-yellow px-4 py-3.5 font-display text-[15px] font-bold text-navy-ink transition hover:bg-yellow-soft disabled:opacity-60"
          >
            Conferir pacote
          </button>
        </form>
      )}

      <div className="flex gap-2">
        {!finalizada && (
          <button
            onClick={() => setModalFinalizar(true)}
            className="flex-1 rounded-xl border border-navy px-3 py-3 font-display text-[13.5px] font-bold text-navy transition hover:bg-white"
          >
            Finalizar rota
          </button>
        )}
        <button
          onClick={exportarTxt}
          className="flex-1 rounded-xl border border-line bg-white px-3 py-3 font-display text-[13.5px] font-bold text-navy transition hover:border-navy"
        >
          Baixar .txt
        </button>
        <button
          onClick={() => window.print()}
          className="flex-1 rounded-xl border border-line bg-white px-3 py-3 font-display text-[13.5px] font-bold text-navy transition hover:border-navy"
        >
          Gerar PDF
        </button>
      </div>

      <section>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar código"
          className="w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-navy"
        />

        <ul className="mt-3 flex flex-col gap-2">
          {visiveis.map((pacote) => (
            <li key={pacote.id} className="card flex items-center gap-3 px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[14px] font-medium text-navy-ink">
                  {pacote.codigo}
                </p>
                {pacote.parada && (
                  <p className="text-[12px] text-muted">Parada {pacote.parada}</p>
                )}
              </div>

              {pacote.excedente && (
                <span className="rounded-md bg-warn-bg px-2 py-1 text-[10.5px] font-bold text-warn">
                  EXCEDENTE
                </span>
              )}

              {!finalizada && (
                <button
                  onClick={() => remover(pacote)}
                  aria-label={`Remover ${pacote.codigo}`}
                  className="rounded-lg border border-line px-2 py-1 text-[12px] font-semibold text-danger transition hover:bg-danger-bg"
                >
                  Remover
                </button>
              )}
            </li>
          ))}

          {visiveis.length === 0 && (
            <li className="card px-4 py-6 text-center text-[13.5px] text-muted">
              {busca ? "Nenhum código encontrado." : "Nenhum pacote conferido ainda."}
            </li>
          )}
        </ul>
      </section>

      {modalFinalizar && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="animate-pop-in card w-full max-w-[380px] p-5">
            <h2 className="font-display text-[17px] font-bold text-navy">Finalizar rota</h2>
            <dl className="mt-3 flex flex-col gap-1.5 text-[14px]">
              <Linha termo="Esperados" valor={rota.qtd_esperada} />
              <Linha termo="Conferidos" valor={resumo.conferidos} />
              <Linha termo="Faltantes" valor={resumo.faltantes} />
              <Linha termo="Excedentes" valor={resumo.excedentes} />
            </dl>
            <p className="mt-3 text-[13px] text-muted">
              Depois de finalizada a rota não aceita mais pacotes.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setModalFinalizar(false)}
                className="flex-1 rounded-xl border border-line px-4 py-3 font-display text-[14px] font-bold text-navy"
              >
                Cancelar
              </button>
              <button
                onClick={finalizar}
                disabled={salvando}
                className="flex-1 rounded-xl bg-yellow px-4 py-3 font-display text-[14px] font-bold text-navy-ink disabled:opacity-60"
              >
                Finalizar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Linha({ termo, valor }: { termo: string; valor: number }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted">{termo}</dt>
      <dd className="font-display font-bold tabular-nums text-navy-ink">{valor}</dd>
    </div>
  );
}
