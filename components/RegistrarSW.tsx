"use client";

import { useEffect } from "react";

/** Registra o service worker — é o que torna o app instalável. */
export function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const registrar = () => {
      navigator.serviceWorker.register("/sw.js").catch((erro) => {
        console.error("[pwa] service worker não registrou:", erro);
      });
    };

    // Depois do load: registrar durante o carregamento disputa banda com a
    // própria página.
    if (document.readyState === "complete") registrar();
    else window.addEventListener("load", registrar, { once: true });
  }, []);

  return null;
}
