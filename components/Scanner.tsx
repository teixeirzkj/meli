"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { definirSom, desbloquearSom, somLigado } from "@/lib/som";

/** Formatos que aparecem em etiqueta de pacote. */
const FORMATOS = [
  "code_128",
  "code_39",
  "code_93",
  "codabar",
  "ean_13",
  "ean_8",
  "itf",
  "upc_a",
  "upc_e",
  "qr_code",
  "data_matrix",
  "pdf417",
] as const;

type DetectorNativo = {
  detect: (fonte: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

type ConstrutorDetector = {
  new (opcoes: { formats: readonly string[] }): DetectorNativo;
  getSupportedFormats: () => Promise<string[]>;
};

type Resultado = { tom: "ok" | "alerta" | "erro"; msg: string; registrado: boolean };
type Leitura = { codigo: string } & Resultado;

export function Scanner({
  aberto,
  onFechar,
  onCodigo,
  onDigitar,
}: {
  aberto: boolean;
  onFechar: () => void;
  /** Devolve o que mostrar na tela do scanner e se o pacote foi registrado. */
  onCodigo: (codigo: string) => Promise<Resultado>;
  onDigitar: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const pararRef = useRef<(() => void) | null>(null);
  const ultimaRef = useRef<{ codigo: string; em: number }>({ codigo: "", em: 0 });
  const ocupadoRef = useRef(false);

  const [erro, setErro] = useState<string | null>(null);
  const [motor, setMotor] = useState<"nativo" | "zxing" | null>(null);
  const [lanterna, setLanterna] = useState<boolean | null>(null);
  const [lidos, setLidos] = useState<Leitura[]>([]);
  const [comSom, setComSom] = useState(true);

  // onCodigo é recriado a cada render do pai. Guardado em ref, tratarCodigo
  // fica estável e o efeito abaixo não reinicia a câmera a cada leitura.
  const onCodigoRef = useRef(onCodigo);
  onCodigoRef.current = onCodigo;

  const onFecharRef = useRef(onFechar);
  onFecharRef.current = onFechar;

  const fechandoRef = useRef(false);

  const tratarCodigo = useCallback(
    async (bruto: string) => {
      const codigo = bruto.trim();
      if (!codigo || ocupadoRef.current || fechandoRef.current) return;

      // A câmera lê o mesmo código dezenas de vezes por segundo enquanto a
      // etiqueta está no quadro: só aceita de novo depois de 2,5s.
      const agora = Date.now();
      if (ultimaRef.current.codigo === codigo && agora - ultimaRef.current.em < 2500) return;
      ultimaRef.current = { codigo, em: agora };

      ocupadoRef.current = true;
      const resultado = await onCodigoRef.current(codigo);
      ocupadoRef.current = false;

      setLidos((atual) => [{ codigo, ...resultado }, ...atual].slice(0, 6));

      // Um pacote por abertura da câmera: fechando aqui, quem confere volta a
      // ver a parada selecionada antes do próximo bipe. Sem isso dá para
      // emendar dezenas de pacotes na parada errada sem perceber.
      if (resultado.registrado) {
        fechandoRef.current = true;
        window.setTimeout(() => onFecharRef.current(), 700);
      }
    },
    [],
  );

  useEffect(() => {
    if (!aberto) return;

    let cancelado = false;

    async function iniciar() {
      setErro(null);
      setLidos([]);
      fechandoRef.current = false;
      setComSom(somLigado());
      desbloquearSom();

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (e) {
        if (cancelado) return;
        const nome = e instanceof DOMException ? e.name : "";
        setErro(
          nome === "NotAllowedError"
            ? "Permissão de câmera negada. Libere o acesso nas configurações do navegador."
            : nome === "NotFoundError"
              ? "Nenhuma câmera encontrada neste aparelho."
              : "Não deu para abrir a câmera aqui.",
        );
        return;
      }

      if (cancelado) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play().catch(() => {});

      // Lanterna, quando o aparelho expõe o controle.
      const track = stream.getVideoTracks()[0];
      const capacidades = track.getCapabilities?.() as { torch?: boolean } | undefined;
      setLanterna(capacidades?.torch ? false : null);

      const Detector = (window as unknown as { BarcodeDetector?: ConstrutorDetector })
        .BarcodeDetector;

      if (Detector) {
        setMotor("nativo");
        const suportados = await Detector.getSupportedFormats().catch((): string[] => []);
        const formats = FORMATOS.filter((f) => suportados.includes(f));
        const detector = new Detector({ formats: formats.length ? formats : FORMATOS });

        let ativo = true;
        pararRef.current = () => {
          ativo = false;
        };

        const laco = async () => {
          while (ativo && !cancelado) {
            try {
              const achados = await detector.detect(video);
              if (achados[0]?.rawValue) await tratarCodigo(achados[0].rawValue);
            } catch {
              /* quadro ruim: tenta o próximo */
            }
            await new Promise((r) => setTimeout(r, 180));
          }
        };

        laco();
        return;
      }

      // Safari e afins: o leitor em JS entra só aqui, sob demanda.
      setMotor("zxing");
      const { BrowserMultiFormatReader } = await import("@zxing/browser");
      if (cancelado) return;

      const leitor = new BrowserMultiFormatReader();
      const controles = await leitor.decodeFromStream(stream, video, (resultado) => {
        if (resultado) tratarCodigo(resultado.getText());
      });

      pararRef.current = () => controles.stop();
    }

    iniciar();

    return () => {
      cancelado = true;
      pararRef.current?.();
      pararRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setMotor(null);
    };
  }, [aberto, tratarCodigo]);

  async function alternarLanterna() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track || lanterna === null) return;

    try {
      // torch ainda não está na tipagem padrão do DOM, mas funciona no Chrome
      // Android — que é onde o entregador vai usar.
      await track.applyConstraints({
        advanced: [{ torch: !lanterna }],
      } as unknown as MediaTrackConstraints);
      setLanterna(!lanterna);
    } catch {
      setLanterna(null);
    }
  }

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="absolute inset-0 size-full object-cover"
      />

      {/* Mira: a área clara marca onde encostar a etiqueta. */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="relative h-[190px] w-[78%] max-w-[420px] rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
          <span className="absolute -left-px -top-px size-9 rounded-tl-2xl border-l-4 border-t-4 border-yellow" />
          <span className="absolute -right-px -top-px size-9 rounded-tr-2xl border-r-4 border-t-4 border-yellow" />
          <span className="absolute -bottom-px -left-px size-9 rounded-bl-2xl border-b-4 border-l-4 border-yellow" />
          <span className="absolute -bottom-px -right-px size-9 rounded-br-2xl border-b-4 border-r-4 border-yellow" />
        </div>
      </div>

      <header className="relative flex items-center justify-between gap-3 p-4">
        <div>
          <p className="font-display text-[15px] font-bold text-white">Escanear pacote</p>
          <p className="text-[11.5px] text-white/70">
            {erro
              ? "câmera indisponível"
              : motor === "nativo"
                ? "leitura nativa do aparelho"
                : motor === "zxing"
                  ? "leitor compatível"
                  : "abrindo câmera…"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const novo = !comSom;
              definirSom(novo);
              setComSom(novo);
            }}
            aria-pressed={comSom}
            aria-label={comSom ? "Desligar o bipe" : "Ligar o bipe"}
            className={`rounded-xl px-3 py-2 text-[12.5px] font-bold transition ${
              comSom ? "bg-white/15 text-white" : "bg-white/30 text-white/60 line-through"
            }`}
          >
            Bipe
          </button>

          {lanterna !== null && (
            <button
              onClick={alternarLanterna}
              aria-pressed={lanterna}
              className={`rounded-xl px-3 py-2 text-[12.5px] font-bold transition ${
                lanterna ? "bg-yellow text-navy-ink" : "bg-white/15 text-white"
              }`}
            >
              Lanterna
            </button>
          )}
          <button
            onClick={onFechar}
            aria-label="Fechar scanner"
            className="rounded-xl bg-white/15 px-3 py-2 text-[12.5px] font-bold text-white"
          >
            Fechar
          </button>
        </div>
      </header>

      <div className="relative mt-auto flex flex-col gap-3 p-4">
        {erro && (
          <p className="rounded-xl bg-danger-bg px-3.5 py-3 text-[13px] font-medium text-danger">
            {erro}
          </p>
        )}

        {/* Últimas leituras: confirma o que entrou sem sair da câmera. */}
        <ul className="flex flex-col gap-1.5">
          {lidos.map((leitura, i) => (
            <li
              key={`${leitura.codigo}-${i}`}
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-[12.5px] font-semibold backdrop-blur ${
                leitura.tom === "ok"
                  ? "bg-success/85 text-white"
                  : leitura.tom === "alerta"
                    ? "bg-warn/85 text-white"
                    : "bg-danger/85 text-white"
              }`}
              style={{ opacity: 1 - i * 0.13 }}
            >
              <span className="font-mono">{leitura.codigo}</span>
              <span className="ml-auto font-normal">{leitura.msg}</span>
            </li>
          ))}
        </ul>

        <p className="text-center text-[11.5px] text-white/60">
          A câmera fecha sozinha a cada pacote registrado, para você conferir a parada
          antes do próximo.
        </p>

        <button
          onClick={onDigitar}
          className="rounded-xl bg-white/15 px-4 py-3 font-display text-[14px] font-bold text-white"
        >
          Digitar manualmente
        </button>
      </div>
    </div>
  );
}
