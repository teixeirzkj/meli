"use client";

import { useFormStatus } from "react-dom";

/**
 * Dá resposta imediata ao clique: o formulário é enviado ao servidor e a
 * navegação só acontece depois, então sem isto o botão fica inerte e parece
 * que nada aconteceu.
 */
export function BotaoSubmit({
  children,
  pendenteLabel = "Salvando…",
  className = "",
}: {
  children: React.ReactNode;
  pendenteLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`rounded-xl bg-yellow px-4 py-3.5 font-display text-[15px] font-bold text-navy-ink transition hover:bg-yellow-soft disabled:opacity-60 ${className}`}
    >
      {pending ? pendenteLabel : children}
    </button>
  );
}
