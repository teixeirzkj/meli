export function Stat({
  label,
  valor,
  tom = "neutro",
}: {
  label: string;
  valor: number | string;
  tom?: "neutro" | "ok" | "alerta" | "erro";
}) {
  const cor = {
    neutro: "text-navy",
    ok: "text-success",
    alerta: "text-warn",
    erro: "text-danger",
  }[tom];

  return (
    <div className="card px-3 py-2.5">
      <p className="text-[11.5px] font-medium text-muted">{label}</p>
      <p className={`font-display text-[22px] font-bold tabular-nums ${cor}`}>{valor}</p>
    </div>
  );
}
