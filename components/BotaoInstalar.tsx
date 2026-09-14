"use client";

import { useEffect, useState } from "react";

type PromptInstalacao = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * Android/Chrome expõem o convite de instalação via beforeinstallprompt. O iOS
 * não expõe nada: lá a instalação é manual, pelo menu Compartilhar, então o
 * componente vira instrução em vez de botão.
 */
export function BotaoInstalar() {
  const [convite, setConvite] = useState<PromptInstalacao | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [ios, setIos] = useState(false);

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

  if (ios) {
    return (
      <section className="card p-5">
        <h2 className="font-display text-[16px] font-bold text-navy">
          Instalar na tela inicial
        </h2>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
          No iPhone, toque em <b>Compartilhar</b> na barra do Safari e escolha{" "}
          <b>Adicionar à Tela de Início</b>. O app abre em tela cheia, sem a barra do
          navegador.
        </p>
      </section>
    );
  }

  if (!convite) return null;

  return (
    <section className="card p-5">
      <h2 className="font-display text-[16px] font-bold text-navy">
        Instalar na tela inicial
      </h2>
      <p className="mt-1.5 text-[13.5px] text-muted">
        Abre em tela cheia, com ícone próprio — igual a um aplicativo.
      </p>
      <button
        onClick={async () => {
          await convite.prompt();
          const { outcome } = await convite.userChoice;
          if (outcome === "accepted") setInstalado(true);
          setConvite(null);
        }}
        className="mt-4 w-full rounded-xl bg-yellow px-4 py-3 font-display text-[14px] font-bold text-navy-ink transition hover:bg-yellow-soft"
      >
        Instalar aplicativo
      </button>
    </section>
  );
}
