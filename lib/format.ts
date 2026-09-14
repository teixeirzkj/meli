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

export function somarDias(iso: string, dias: number): string {
  const data = new Date(`${iso.slice(0, 10)}T00:00:00`);
  data.setDate(data.getDate() + dias);
  return data.toISOString().slice(0, 10);
}

/** Qualquer data do mês -> primeiro dia dele, que é como a competência é guardada. */
export function primeiroDiaDoMes(iso: string): string {
  return `${iso.slice(0, 7)}-01`;
}

export function mesAtual(): string {
  return `${hoje().slice(0, 7)}-01`;
}

const MESES = [
  "jan", "fev", "mar", "abr", "mai", "jun",
  "jul", "ago", "set", "out", "nov", "dez",
];

/** "2026-09-01" -> "set/26" */
export function mesCurto(iso: string): string {
  const [ano, mes] = iso.slice(0, 10).split("-");
  return `${MESES[Number(mes) - 1]}/${ano.slice(2)}`;
}

export function moeda(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

/** Mesma coisa, sem centavos — para números grandes em cartão de destaque. */
export function moedaCurta(valor: number): string {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function resumoRota(qtdEsperada: number, conferidos: number, excedentes: number) {
  const validos = conferidos - excedentes;
  return {
    conferidos,
    excedentes,
    faltantes: Math.max(0, qtdEsperada - validos),
  };
}

/** Últimos N meses em competência (primeiro dia), do mais antigo ao atual. */
export function ultimosMeses(n: number): string[] {
  const meses: string[] = [];
  const base = new Date();
  base.setDate(1);

  for (let i = n - 1; i >= 0; i--) {
    const data = new Date(base);
    data.setMonth(data.getMonth() - i);
    meses.push(`${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-01`);
  }

  return meses;
}
