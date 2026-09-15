"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatData, resumoRota } from "@/lib/format";
import { Stat } from "@/components/Stat";
import { Scanner } from "@/components/Scanner";
import { ControleSom } from "@/components/ControleSom";
import { desbloquearSom, feedbackSonoro, somLigado } from "@/lib/som";
import type { AppConfig, Pacote, Rota } from "@/lib/types";

type Tom = "ok" | "erro" | "alerta";
/** registrado: o pacote entrou mesmo no banco (não é repetido nem recusado). */
type Resultado = { tom: Tom; msg: string; registrado: boolean };
type Feedback = { tom: Tom; msg: string; sub?: string };

/**
 * Ordena pela parada, em ordem de entrega. Parada costuma ser número, mas o
 * campo é livre: o que não for número vai para o fim, em ordem alfabética, e
 * pacote sem parada fica por último.
 */
function porParada(a: Pacote, b: Pacote): number {
  const valor = (p: Pacote) => {
    const bruto = p.parada?.trim();
    if (!bruto) return { grupo: 2, num: 0, texto: "" };

    const num = Number(bruto.replace(",", "."));
    return Number.isFinite(num)
      ? { grupo: 0, num, texto: bruto }
      : { grupo: 1, num: 0, texto: bruto.toLowerCase() };
  };

  const x = valor(a);
  const y = valor(b);

  if (x.grupo !== y.grupo) return x.grupo - y.grupo;
  if (x.grupo === 0 && x.num !== y.num) return x.num - y.num;
  if (x.texto !== y.texto) return x.texto.localeCompare(y.texto, "pt-BR");

  // Mesma parada: mantém a ordem em que foram bipados.
  return a.created_at.localeCompare(b.created_at);
}

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
  const [modalExcluir, setModalExcluir] = useState(false);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [destacarParada, setDestacarParada] = useState(false);
  const [esperadoDigitado, setEsperadoDigitado] = useState("");
  const [salvando, setSalvando] = useState(false);

  // Lê a preferência de som guardada no aparelho.
  useEffect(() => {
    somLigado();
  }, []);

  const finalizada = rota.status === "finalizada";
  const resumo = resumoRota(rota.qtd_esperada, pacotes.length);

  // A lista fica na ordem de entrega e se reorganiza a cada pacote bipado.
  const ordenados = useMemo(() => [...pacotes].sort(porParada), [pacotes]);
  const visiveis = busca.trim()
    ? ordenados.filter((p) => p.codigo.toLowerCase().includes(busca.trim().toLowerCase()))
    : ordenados;

  const paradas = useMemo(
    () => new Set(pacotes.map((p) => p.parada?.trim()).filter(Boolean)).size,
    [pacotes],
  );

  /**
   * Um caminho só para o código, venha do teclado ou da câmera. Devolve o
   * resultado para o scanner mostrar sem precisar fechar.
   */
  async function registrar(valor: string): Promise<Resultado> {
    if (finalizada)
      return devolver(valor, { tom: "erro", msg: "rota finalizada", registrado: false });

    const { codigo_min_digitos: min, codigo_max_digitos: max } = config;

    if (valor.length < min || valor.length > max) {
      return devolver(valor, {
        tom: "erro",
        msg: min === max ? `use ${min} caracteres` : `use de ${min} a ${max} caracteres`,
        registrado: false,
      });
    }

    if (pacotes.some((p) => p.codigo === valor)) {
      return devolver(valor, { tom: "alerta", msg: "já conferido", registrado: false });
    }

    const { data, error } = await supabase
      .from("pacotes")
      .insert({
        rota_id: rota.id,
        user_id: rota.user_id,
        codigo: valor,
        parada: parada.trim() || null,
      })
      .select("*")
      .single<Pacote>();

    if (error || !data) {
      return devolver(valor, {
        tom: "erro",
        msg: error?.message ?? "não salvou",
        registrado: false,
      });
    }

    setPacotes((atual) => [data, ...atual]);
    router.refresh();

    return devolver(valor, { tom: "ok", msg: "conferido", registrado: true });
  }

  /**
   * Ponto único de saída: toca o som e mostra o aviso na tela da rota — que é
   * para onde a câmera volta depois de cada pacote.
   */
  function devolver(codigoLido: string, r: Resultado): Resultado {
    feedbackSonoro(r.tom);

    avisar({
      tom: r.tom,
      msg:
        r.tom === "ok" ? "Pacote conferido" : r.tom === "alerta" ? "Atenção" : "Não registrado",
      sub: `${codigoLido} — ${r.msg}`,
    });

    if (r.registrado) {
      setDestacarParada(true);
      window.setTimeout(() => setDestacarParada(false), 2600);
    }

    return r;
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    if (finalizada || salvando) return;

    const valor = codigo.trim();
    if (!valor) return;

    desbloquearSom();
    setSalvando(true);
    const r = await registrar(valor);
    setSalvando(false);

    if (r.registrado) setCodigo("");
    inputRef.current?.focus();
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

  async function excluirRota() {
    setSalvando(true);
    const { error } = await supabase.from("rotas").delete().eq("id", rota.id);

    if (error) {
      setSalvando(false);
      setModalExcluir(false);
      return avisar({ tom: "erro", msg: "Não excluiu", sub: error.message });
    }

    // Sai antes de liberar o botão: a rota não existe mais para renderizar.
    router.replace("/");
    router.refresh();
  }

  /** Fecha a rota declarando quantos pacotes ela deveria ter. */
  async function finalizar() {
    const esperado = Number(esperadoDigitado);
    if (!Number.isInteger(esperado) || esperado < 0) {
      return avisar({ tom: "erro", msg: "Informe um número válido de pacotes." });
    }

    setSalvando(true);
    const { data, error } = await supabase
      .from("rotas")
      .update({
        qtd_esperada: esperado,
        status: "finalizada",
        finalizada_em: new Date().toISOString(),
      })
      .eq("id", rota.id)
      .select("*")
      .single<Rota>();
    setSalvando(false);
    setModalFinalizar(false);

    if (error || !data) {
      return avisar({ tom: "erro", msg: "Não finalizou", sub: error?.message });
    }

    const fechamento = resumoRota(esperado, pacotes.length);
    setRota(data);
    router.refresh();

    feedbackSonoro(
      fechamento.faltantes === 0 && fechamento.excedentes === 0 ? "ok" : "alerta",
    );
    avisar({
      tom: fechamento.faltantes === 0 && fechamento.excedentes === 0 ? "ok" : "alerta",
      msg: "Rota finalizada",
      sub:
        fechamento.faltantes > 0
          ? `${fechamento.faltantes} faltando`
          : fechamento.excedentes > 0
            ? `${fechamento.excedentes} a mais que o esperado`
            : "tudo conferido",
    });
  }

  function avisar(fb: Feedback) {
    setFeedback(fb);
    window.setTimeout(() => setFeedback(null), 3200);
  }

  function exportarTxt() {
    const linhas = [
      `ROTA ${rota.nome}`,
      `Data: ${formatData(rota.data_rota)}`,
      `Status: ${finalizada ? "Finalizada" : "Em conferência"}`,
      `Esperados: ${rota.qtd_esperada ?? "não informado"}`,
      `Conferidos: ${resumo.conferidos}`,
      `Faltantes: ${rota.qtd_esperada == null ? "—" : resumo.faltantes}`,
      `Excedentes: ${rota.qtd_esperada == null ? "—" : resumo.excedentes}`,
      "",
      "PARADA;CÓDIGO",
      ...ordenados.map((p) => `${p.parada ?? "—"};${p.codigo}`),
    ];

    const blob = new Blob([linhas.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `rota-${rota.nome.replace(/[^\w-]+/g, "-").toLowerCase()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Prévia do fechamento enquanto o número é digitado no diálogo.
  const previa = (() => {
    const n = Number(esperadoDigitado);
    if (!esperadoDigitado || !Number.isInteger(n) || n < 0) return null;
    return resumoRota(n, pacotes.length);
  })();

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

      {rota.qtd_esperada == null ? (
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Conferidos" valor={resumo.conferidos} tom="ok" />
          <Stat label="Paradas" valor={paradas} />
        </div>
      ) : (
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
      )}

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
          {resumo.faltantes === 0 && resumo.excedentes === 0
            ? "Rota finalizada com tudo conferido."
            : resumo.faltantes > 0
              ? `Rota finalizada com ${resumo.faltantes} pacote(s) faltando.`
              : `Rota finalizada com ${resumo.excedentes} pacote(s) a mais que o esperado.`}
        </p>
      ) : (
        <>
          <ControleSom />

          <button
            onClick={() => {
              desbloquearSom();
              setScannerAberto(true);
            }}
            className="flex items-center justify-center gap-2.5 rounded-xl bg-navy px-4 py-4 font-display text-[15px] font-bold text-white transition hover:bg-navy-soft"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.9"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
              <path d="M7 8v8M10.5 8v8M14 8v8M17 8v8" />
            </svg>
            <span className="flex flex-col items-start leading-tight">
              Escanear com a câmera
              <span className="text-[11.5px] font-medium text-white/70">
                {parada.trim() ? `Parada ${parada.trim()}` : "sem parada definida"}
              </span>
            </span>
          </button>

          <form onSubmit={adicionar} className="card flex flex-col gap-3 p-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-navy-ink">
                Código do pacote
              </span>
              <input
                ref={inputRef}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                autoComplete="off"
                placeholder="Bipe, escaneie ou digite"
                className="rounded-xl border border-line bg-surface-alt px-3.5 py-3 font-mono text-[15px] outline-none focus:border-navy"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-[13px] font-semibold text-navy-ink">
                Parada (opcional)
              </span>
              <input
                value={parada}
                onChange={(e) => setParada(e.target.value)}
                autoComplete="off"
                inputMode="numeric"
                placeholder="Ex.: 12"
                className={`rounded-xl border bg-surface-alt px-3.5 py-3 text-[15px] outline-none transition focus:border-navy ${
                  destacarParada ? "border-yellow ring-4 ring-yellow/35" : "border-line"
                }`}
              />
              {destacarParada && (
                <span className="animate-fb-in text-[11.5px] font-semibold text-warn">
                  Confira a parada antes do próximo pacote.
                </span>
              )}
            </label>

            <button
              type="submit"
              disabled={salvando}
              className="rounded-xl bg-yellow px-4 py-3.5 font-display text-[15px] font-bold text-navy-ink transition hover:bg-yellow-soft disabled:opacity-60"
            >
              {salvando ? "Salvando…" : "Conferir pacote"}
            </button>
          </form>
        </>
      )}

      <div className="flex gap-2">
        {!finalizada && (
          <button
            onClick={() => {
              setEsperadoDigitado(String(pacotes.length));
              setModalFinalizar(true);
            }}
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

      <button
        onClick={() => setModalExcluir(true)}
        className="self-start rounded-xl border border-danger-line bg-danger-bg px-3.5 py-2.5 font-display text-[13px] font-bold text-danger transition hover:bg-[#fde4e2]"
      >
        Excluir rota
      </button>

      <section>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[14px] font-bold text-navy">
            Pacotes por parada
          </h2>
          <span className="text-[12px] text-muted">
            {pacotes.length} {pacotes.length === 1 ? "pacote" : "pacotes"}
          </span>
        </div>

        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Pesquisar código"
          className="mt-2.5 w-full rounded-xl border border-line bg-white px-3.5 py-2.5 text-[14px] outline-none focus:border-navy"
        />

        <ul className="mt-3 flex flex-col gap-2">
          {visiveis.map((pacote, i) => (
            <li key={pacote.id} className="card flex items-center gap-3 px-3.5 py-2.5">
              <span className="w-6 shrink-0 text-center font-display text-[13px] font-bold tabular-nums text-muted">
                {i + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[14px] font-medium text-navy-ink">
                  {pacote.codigo}
                </p>
                <p className="text-[12px] text-muted">
                  {pacote.parada ? `Parada ${pacote.parada}` : "sem parada"}
                </p>
              </div>

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

      <Scanner
        aberto={scannerAberto}
        onFechar={() => setScannerAberto(false)}
        onCodigo={registrar}
        onDigitar={() => {
          setScannerAberto(false);
          window.setTimeout(() => inputRef.current?.focus(), 80);
        }}
      />

      {modalExcluir && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="animate-pop-in card w-full max-w-[380px] p-5">
            <h2 className="font-display text-[17px] font-bold text-navy">Excluir rota</h2>
            <p className="mt-2 text-[13.5px] text-muted">
              A rota <b className="text-navy-ink">{rota.nome}</b>
              {resumo.conferidos > 0 && (
                <>
                  {" "}
                  e os <b className="text-navy-ink">{resumo.conferidos}</b> pacotes já
                  conferidos nela
                </>
              )}{" "}
              somem para sempre. Não dá para desfazer.
            </p>

            {resumo.conferidos > 0 && (
              <button
                onClick={exportarTxt}
                className="mt-3 w-full rounded-xl border border-line px-4 py-2.5 font-display text-[13px] font-bold text-navy"
              >
                Baixar o .txt antes
              </button>
            )}

            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setModalExcluir(false)}
                className="flex-1 rounded-xl border border-line px-4 py-3 font-display text-[14px] font-bold text-navy"
              >
                Cancelar
              </button>
              <button
                onClick={excluirRota}
                disabled={salvando}
                className="flex-1 rounded-xl border border-danger-line bg-danger-bg px-4 py-3 font-display text-[14px] font-bold text-danger disabled:opacity-60"
              >
                {salvando ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalFinalizar && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="animate-pop-in card w-full max-w-[380px] p-5">
            <h2 className="font-display text-[17px] font-bold text-navy">Finalizar rota</h2>
            <p className="mt-1.5 text-[13px] text-muted">
              Você conferiu <b className="text-navy-ink">{pacotes.length}</b> pacotes.
              Quantos a rota deveria ter?
            </p>

            <input
              type="number"
              inputMode="numeric"
              min={0}
              autoFocus
              value={esperadoDigitado}
              onChange={(e) => setEsperadoDigitado(e.target.value)}
              className="mt-3 w-full rounded-xl border border-line bg-surface-alt px-3.5 py-3 text-center font-display text-[22px] font-bold tabular-nums text-navy-ink outline-none focus:border-navy"
            />

            {previa && (
              <p
                className={`mt-3 rounded-lg px-3 py-2.5 text-center text-[13px] font-semibold ${
                  previa.faltantes === 0 && previa.excedentes === 0
                    ? "bg-success-bg text-success"
                    : previa.faltantes > 0
                      ? "bg-danger-bg text-danger"
                      : "bg-warn-bg text-warn"
                }`}
              >
                {previa.faltantes === 0 && previa.excedentes === 0
                  ? "Bate certinho — nenhum pacote faltando."
                  : previa.faltantes > 0
                    ? `Vão faltar ${previa.faltantes} pacote(s).`
                    : `Sobram ${previa.excedentes} pacote(s) além do esperado.`}
              </p>
            )}

            <p className="mt-3 text-[12px] text-muted">
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
                disabled={salvando || !previa}
                className="flex-1 rounded-xl bg-yellow px-4 py-3 font-display text-[14px] font-bold text-navy-ink disabled:opacity-60"
              >
                {salvando ? "Finalizando…" : "Finalizar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
