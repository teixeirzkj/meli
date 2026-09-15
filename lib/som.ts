/**
 * Som e vibração da conferência.
 *
 * Três cuidados que fazem a diferença no galpão:
 *
 * 1. Um único AudioContext para a página inteira. Criar um por bipe estoura o
 *    limite do navegador (o Chrome corta perto do sexto) e o som some no meio
 *    da conferência, justo quando já se confia nele.
 * 2. O contexto precisa ser destravado dentro de um gesto do usuário — celular
 *    bloqueia áudio que nasce sozinho. Daí `desbloquearSom()`, chamado no toque
 *    que abre a câmera ou envia o formulário.
 * 3. Tons distintos por resultado: o conferente está olhando a etiqueta, não a
 *    tela, e precisa saber pelo ouvido se o pacote entrou.
 */

const CHAVE_PREFERENCIA = "rotas:som";

let contexto: AudioContext | null = null;
let ligado = true;

export type TomFeedback = "ok" | "alerta" | "erro";

function obterContexto(): AudioContext | null {
  if (typeof window === "undefined") return null;

  if (!contexto) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return null;

    try {
      contexto = new Ctor();
    } catch {
      return null;
    }
  }

  // Volta de suspenso — acontece toda vez que o app fica em segundo plano.
  if (contexto.state === "suspended") void contexto.resume().catch(() => {});

  return contexto;
}

/** Chame dentro de um clique/toque, antes de precisar do som. */
export function desbloquearSom(): void {
  obterContexto();
}

export function somLigado(): boolean {
  if (typeof window === "undefined") return true;

  try {
    const salvo = window.localStorage.getItem(CHAVE_PREFERENCIA);
    ligado = salvo !== "0";
  } catch {
    /* navegação privada: mantém o padrão */
  }

  return ligado;
}

export function definirSom(valor: boolean): void {
  ligado = valor;

  try {
    window.localStorage.setItem(CHAVE_PREFERENCIA, valor ? "1" : "0");
  } catch {
    /* sem persistir, vale só nesta sessão */
  }
}

type Nota = { hz: number; ms: number; atraso?: number; volume?: number };

function tocar(notas: Nota[], forma: OscillatorType = "square"): void {
  if (!ligado) return;

  const ctx = obterContexto();
  if (!ctx) return;

  for (const { hz, ms, atraso = 0, volume = 0.22 } of notas) {
    const inicio = ctx.currentTime + atraso / 1000;
    const fim = inicio + ms / 1000;

    const osc = ctx.createOscillator();
    const ganho = ctx.createGain();

    osc.type = forma;
    osc.frequency.setValueAtTime(hz, inicio);

    // Rampas curtas nas pontas: sem elas o alto-falante estala.
    ganho.gain.setValueAtTime(0.0001, inicio);
    ganho.gain.exponentialRampToValueAtTime(volume, inicio + 0.008);
    ganho.gain.setValueAtTime(volume, fim - 0.012);
    ganho.gain.exponentialRampToValueAtTime(0.0001, fim);

    osc.connect(ganho).connect(ctx.destination);
    osc.start(inicio);
    osc.stop(fim + 0.02);
  }
}

function vibrar(padrao: number | number[]): void {
  try {
    navigator.vibrate?.(padrao);
  } catch {
    /* aparelho sem vibração */
  }
}

/** Bipe agudo e curto — o mesmo formato do leitor de supermercado. */
export function bipOk(): void {
  tocar([{ hz: 1175, ms: 95 }]);
  vibrar(55);
}

/** Dois toques médios: já conferido ou excedente — pare e olhe. */
export function bipAlerta(): void {
  tocar([
    { hz: 740, ms: 80 },
    { hz: 740, ms: 80, atraso: 130 },
  ]);
  vibrar([50, 70, 50]);
}

/** Grave e longo: não entrou. */
export function bipErro(): void {
  tocar([{ hz: 190, ms: 300, volume: 0.26 }], "sawtooth");
  vibrar([90, 60, 160]);
}

export function feedbackSonoro(tom: TomFeedback): void {
  if (tom === "ok") return bipOk();
  if (tom === "alerta") return bipAlerta();
  return bipErro();
}
