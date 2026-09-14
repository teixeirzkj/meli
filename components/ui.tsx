"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef } from "react";

export const CAMPO =
  "w-full rounded-xl border border-line bg-surface-alt px-3.5 py-2.5 text-[14.5px] text-navy-ink outline-none transition placeholder:text-[#94a0b4] focus:border-navy focus:bg-white";

export function Campo({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-semibold text-navy-ink">{label}</span>
      {children}
      {hint && <span className="text-[11.5px] text-muted">{hint}</span>}
    </label>
  );
}

export function Botao({
  variante = "primario",
  className = "",
  ...props
}: {
  variante?: "primario" | "secundario" | "perigo" | "fantasma";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const estilos = {
    primario: "bg-yellow text-navy-ink hover:bg-yellow-soft",
    secundario: "border border-line bg-white text-navy hover:border-navy",
    perigo: "border border-danger-line bg-danger-bg text-danger hover:bg-[#fde4e2]",
    fantasma: "text-navy hover:bg-surface-alt",
  }[variante];

  return (
    <button
      {...props}
      className={`rounded-xl px-3.5 py-2.5 font-display text-[13.5px] font-bold transition disabled:cursor-not-allowed disabled:opacity-55 ${estilos} ${className}`}
    />
  );
}

export function Selo({
  tom,
  children,
}: {
  tom: "ok" | "alerta" | "erro" | "neutro" | "info";
  children: React.ReactNode;
}) {
  const estilos = {
    ok: "bg-success-bg text-success",
    alerta: "bg-warn-bg text-warn",
    erro: "bg-danger-bg text-danger",
    neutro: "bg-surface-alt text-muted",
    info: "bg-navy text-white",
  }[tom];

  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide ${estilos}`}
    >
      {children}
    </span>
  );
}

export function Dialogo({
  aberto,
  titulo,
  descricao,
  onFechar,
  children,
}: {
  aberto: boolean;
  titulo: string;
  descricao?: string;
  onFechar: () => void;
  children: React.ReactNode;
}) {
  const caixaRef = useRef<HTMLDivElement>(null);

  // onFechar chega como arrow function nova a cada render do pai. Se ela
  // entrasse nas dependências do efeito abaixo, cada tecla digitada rodaria o
  // efeito de novo e roubaria o foco do campo — daí o "tem que clicar a cada
  // letra". A ref mantém o handler atual sem virar dependência.
  const fecharRef = useRef(onFechar);
  fecharRef.current = onFechar;

  useEffect(() => {
    if (!aberto) return;

    function onTecla(e: KeyboardEvent) {
      if (e.key === "Escape") fecharRef.current();
    }

    document.addEventListener("keydown", onTecla);
    document.body.style.overflow = "hidden";

    // Foco vai para o primeiro campo, uma vez só, na abertura.
    const primeiro = caixaRef.current?.querySelector<HTMLElement>(
      "input:not([type=hidden]), select, textarea",
    );
    (primeiro ?? caixaRef.current)?.focus();

    return () => {
      document.removeEventListener("keydown", onTecla);
      document.body.style.overflow = "";
    };
  }, [aberto]);

  return (
    <AnimatePresence>
      {aberto && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#0f1b33]/45 p-3 backdrop-blur-[2px] sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          onClick={(e) => e.target === e.currentTarget && onFechar()}
        >
          <motion.div
            ref={caixaRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={titulo}
            className="max-h-[92dvh] w-full max-w-[420px] overflow-y-auto rounded-2xl border border-line-soft bg-white p-5 outline-none"
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <div className="mb-4">
              <h2 className="font-display text-[17px] font-bold text-navy">{titulo}</h2>
              {descricao && <p className="mt-1 text-[13px] text-muted">{descricao}</p>}
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Alerta({ tom, children }: { tom: "erro" | "ok" | "alerta"; children: React.ReactNode }) {
  const estilos = {
    erro: "border-danger-line bg-danger-bg text-danger",
    ok: "border-[#b7e4cd] bg-success-bg text-success",
    alerta: "border-warn-line bg-warn-bg text-warn",
  }[tom];

  return (
    <motion.p
      role="alert"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-lg border px-3 py-2 text-[12.5px] font-medium ${estilos}`}
    >
      {children}
    </motion.p>
  );
}
