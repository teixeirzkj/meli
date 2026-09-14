"use client";

import { motion } from "framer-motion";

export function KpiTile({
  label,
  valor,
  detalhe,
  tom = "neutro",
  indice = 0,
}: {
  label: string;
  valor: string | number;
  detalhe?: string;
  tom?: "neutro" | "ok" | "alerta" | "erro";
  indice?: number;
}) {
  const cor = {
    neutro: "text-navy-ink",
    ok: "text-success",
    alerta: "text-warn",
    erro: "text-danger",
  }[tom];

  const barra = {
    neutro: "bg-navy",
    ok: "bg-success",
    alerta: "bg-warn",
    erro: "bg-danger",
  }[tom];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: indice * 0.05, duration: 0.25, ease: "easeOut" }}
      className="card relative overflow-hidden p-4"
    >
      <span className={`absolute inset-y-0 left-0 w-[3px] ${barra}`} aria-hidden="true" />
      <p className="text-[11.5px] font-medium text-muted">{label}</p>
      <p
        className={`mt-1 font-display text-[23px] font-bold leading-none tracking-tight tabular-nums ${cor}`}
      >
        {valor}
      </p>
      {detalhe && <p className="mt-1.5 text-[11.5px] text-muted">{detalhe}</p>}
    </motion.div>
  );
}
