"use client";

import { useEffect, useState } from "react";
import { definirSom, desbloquearSom, somLigado, testarBipe } from "@/lib/som";

/**
 * O bipe pode estar desligado por um toque acidental, e som que falha em
 * silêncio é indistinguível de som quebrado. Por isso o estado fica à vista,
 * na tela da rota, com um teste ao lado.
 */
export function ControleSom() {
  const [ligado, setLigado] = useState(true);

  useEffect(() => {
    setLigado(somLigado());
  }, []);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          const novo = !ligado;
          definirSom(novo);
          setLigado(novo);
          if (novo) {
            desbloquearSom();
            testarBipe();
          }
        }}
        aria-pressed={ligado}
        className={`flex flex-1 items-center gap-2 rounded-xl border px-3 py-2.5 text-[12.5px] font-semibold transition ${
          ligado
            ? "border-line bg-white text-navy"
            : "border-warn-line bg-warn-bg text-warn"
        }`}
      >
        <span aria-hidden="true">{ligado ? "🔊" : "🔇"}</span>
        {ligado ? "Bipe ligado" : "Bipe desligado — toque para ligar"}
      </button>

      {ligado && (
        <button
          type="button"
          onClick={() => {
            desbloquearSom();
            testarBipe();
          }}
          className="rounded-xl border border-line bg-white px-3 py-2.5 text-[12.5px] font-semibold text-navy transition hover:border-navy"
        >
          Testar
        </button>
      )}
    </div>
  );
}
