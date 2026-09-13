/** "2026-09-13" -> "13/09/2026" — sem passar por Date, para não escorregar de fuso. */
export function formatData(iso: string | null): string {
  if (!iso) return "—";
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

export function hoje(): string {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/** Dias que faltam para a data (negativo = vencida). */
export function diasRestantes(iso: string | null): number {
  if (!iso) return 0;
  const alvo = new Date(`${iso.slice(0, 10)}T00:00:00`);
  const agora = new Date();
  agora.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - agora.getTime()) / 86_400_000);
}

export function resumoRota(qtdEsperada: number, conferidos: number, excedentes: number) {
  const validos = conferidos - excedentes;
  return {
    conferidos,
    excedentes,
    faltantes: Math.max(0, qtdEsperada - validos),
  };
}
