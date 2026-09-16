"use client";

import { useEffect, useState } from "react";

type PromptInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Convite para instalar na tela inicial.
 *
 * Android/Chrome avisam por beforeinstallprompt, e aí o clique abre a caixa
 * nativa. Mas o evento nem sempre chega (o navegador tem critérios próprios) e
 * o iOS não o expõe de jeito nenhum — nesses casos o botão passa a instrução em
 * vez de sumir, que era o comportamento anterior: some sem dizer por quê e
 * parece defeito.
 *
 * Quando o app já está instalado o componente não renderiza nada.
 */
export function BotaoInstalar({ compacto = false }: { compacto?: boolean }) {
  const [convite, setConvite] = useState<PromptInstalacao | null>(null);
  const [instalado, setInstalado] = useState(true); // assume instalado até checar
  const [ios, setIos] = useState(false);
  const [instrucoes, setInstrucoes] = useState(false);

  useEffect(() => {
    const emStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setInstalado(emStandalone);

    setIos(
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
        (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
    );

    const aoConvidar = (e: Event) => {
      e.preventDefault();
      setConvite(e as PromptInstalacao);
    };

    window.addEventListener("beforeinstallprompt", aoConvidar);
    window.addEventListener("appinstalled", () => setInstalado(true));

    return () => window.removeEventListener("beforeinstallprompt", aoConvidar);
  }, []);

  if (instalado) return null;

  async function instalar() {
    if (convite) {
      await convite.prompt();
      const { outcome } = await convite.userChoice;
      if (outcome === "accepted") setInstalado(true);
      setConvite(null);
      return;
    }

    // Sem convite do navegador: resta ensinar o caminho manual.
    setInstrucoes(true);
  }

  const passoAPasso = ios
    ? "No iPhone: toque em Compartilhar na barra do Safari e escolha Adicionar à Tela de Início."
    : "No Chrome: abra o menu ⋮ e toque em Instalar aplicativo (ou Adicionar à tela inicial).";

  if (compacto) {
    return (
      <div className="card flex items-center gap-3 border-navy/25 bg-white p-3.5">
        <span aria-hidden="true" className="text-[20px]">
          📲
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-navy-ink">
            Instalar na tela inicial
          </p>
          <p className="text-[11.5px] leading-snug text-muted">
            {instrucoes ? passoAPasso : "Abre em tela cheia, como aplicativo."}
          </p>
        </div>

        {!instrucoes && (
          <button
            onClick={instalar}
            className="shrink-0 rounded-xl bg-yellow px-3.5 py-2.5 font-display text-[13px] font-bold text-navy-ink transition hover:bg-yellow-soft"
          >
            Adicionar
          </button>
        )}
      </div>
    );
  }

  return (
    <section className="card p-5">
      <h2 className="font-display text-[16px] font-bold text-navy">
        Instalar na tela inicial
      </h2>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
        {instrucoes ? passoAPasso : "Abre em tela cheia, com ícone próprio — igual a um aplicativo."}
      </p>

      {!instrucoes && (
        <button
          onClick={instalar}
          className="mt-4 w-full rounded-xl bg-yellow px-4 py-3 font-display text-[14px] font-bold text-navy-ink transition hover:bg-yellow-soft"
        >
          Adicionar à tela inicial
        </button>
      )}
    </section>
  );
}
