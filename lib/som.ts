/**
 * Som e vibração da conferência.
 *
 * Quatro cuidados que fazem a diferença no galpão:
 *
 * 1. Um único AudioContext para a página inteira. Criar um por bipe estoura o
 *    limite do navegador (o Chrome corta perto do sexto) e o som some no meio
 *    da conferência, justo quando já se confia nele.
 * 2. O contexto precisa ser destravado dentro de um gesto do usuário — celular
 *    bloqueia áudio que nasce sozinho. Além dos toques conhecidos, o primeiro
 *    toque em qualquer lugar da página serve.
 * 3. Se o contexto estiver suspenso na hora do bipe, o som sai por um <audio>
 *    com WAV embutido. Perde a nuance dos tons, mas bipa — e bipar é o ponto.
 * 4. Tons distintos por resultado: o conferente está olhando a etiqueta, não a
 *    tela, e precisa saber pelo ouvido se o pacote entrou.
 */

const CHAVE_PREFERENCIA = "rotas:som";

let contexto: AudioContext | null = null;
let ligado = true;
let ouvinteGlobal = false;

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

/**
 * Chame dentro de um clique/toque, antes de precisar do som. Também instala um
 * ouvinte único para o primeiro toque em qualquer lugar: assim o áudio já está
 * liberado mesmo que a pessoa chegue ao bipe por um caminho que não previmos.
 */
export function desbloquearSom(): void {
  obterContexto();

  if (ouvinteGlobal || typeof window === "undefined") return;
  ouvinteGlobal = true;

  const destravar = () => obterContexto();
  window.addEventListener("pointerdown", destravar, { once: true, passive: true });
  window.addEventListener("keydown", destravar, { once: true });
}

export function somLigado(): boolean {
  if (typeof window === "undefined") return true;

  try {
    ligado = window.localStorage.getItem(CHAVE_PREFERENCIA) !== "0";
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

  // Sem Web Audio, ou ainda suspenso: cai para o <audio>, que tem regra de
  // autoplay diferente e costuma passar depois de qualquer toque.
  if (!ctx || ctx.state !== "running") {
    tocarFallback(notas[0]?.hz ?? 1175, notas[0]?.ms ?? 95);
    return;
  }

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

let elementoFallback: HTMLAudioElement | null = null;

function tocarFallback(hz: number, ms: number): void {
  if (typeof window === "undefined") return;

  try {
    if (!elementoFallback) {
      elementoFallback = new Audio(wavDataUri(hz, ms));
      elementoFallback.volume = 0.9;
    }
    elementoFallback.currentTime = 0;
    void elementoFallback.play().catch(() => {});
  } catch {
    /* sem áudio: resta a vibração */
  }
}

/** WAV de um tom só, montado na memória — evita carregar arquivo de som. */
function wavDataUri(hz: number, ms: number): string {
  const taxa = 8000;
  const amostras = Math.round((taxa * ms) / 1000);
  const bytes = new Uint8Array(44 + amostras);
  const view = new DataView(bytes.buffer);

  const texto = (pos: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(pos + i, s.charCodeAt(i));
  };

  texto(0, "RIFF");
  view.setUint32(4, 36 + amostras, true);
  texto(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, taxa, true);
  view.setUint32(28, taxa, true);
  view.setUint16(32, 1, true);
  view.setUint16(34, 8, true); // 8 bits
  texto(36, "data");
  view.setUint32(40, amostras, true);

  for (let i = 0; i < amostras; i++) {
    // Onda quadrada com fade nas pontas, para não estalar.
    const fase = Math.sin((2 * Math.PI * hz * i) / taxa) >= 0 ? 1 : -1;
    const borda = Math.min(i, amostras - i, taxa * 0.005) / (taxa * 0.005);
    view.setUint8(44 + i, 128 + Math.round(fase * 90 * borda));
  }

  let binario = "";
  for (const b of bytes) binario += String.fromCharCode(b);
  return `data:audio/wav;base64,${btoa(binario)}`;
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

/** Toca o bipe de sucesso ignorando a preferência — serve ao botão de teste. */
export function testarBipe(): void {
  const antes = ligado;
  ligado = true;
  bipOk();
  ligado = antes;
}
