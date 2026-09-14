export type Tipo = "user" | "admin";
export type StatusConta = "ativo" | "suspenso" | "bloqueado";
export type RotaStatus = "em_conferencia" | "finalizada";
export type MetodoPagamento = "pix" | "cartao" | "boleto" | "dinheiro" | "outro";

export type Profile = {
  id: string;
  email: string;
  nome: string;
  tipo: Tipo;
  status: StatusConta;
  assinatura_inicio: string;
  assinatura_fim: string;
  created_at: string;
};

export type Rota = {
  id: string;
  user_id: string;
  nome: string;
  qtd_esperada: number;
  data_rota: string;
  status: RotaStatus;
  finalizada_em: string | null;
  created_at: string;
};

export type Pacote = {
  id: string;
  rota_id: string;
  user_id: string;
  codigo: string;
  parada: string | null;
  excedente: boolean;
  created_at: string;
};

export type Pagamento = {
  id: string;
  user_id: string;
  valor: number;
  data_pagamento: string;
  competencia: string;
  metodo: MetodoPagamento;
  observacao: string | null;
  registrado_por: string | null;
  created_at: string;
};

export type AppConfig = {
  id: boolean;
  codigo_min_digitos: number;
  codigo_max_digitos: number;
  /** Ausente enquanto a migration 0003 não roda. */
  dias_retencao_rotas?: number;
  updated_at: string;
};

export type ManutencaoLog = {
  id: number;
  executado_em: string;
  rotas_removidas: number;
  dias_retencao: number;
};

export type RotaResumo = Rota & {
  conferidos: number;
  excedentes: number;
  faltantes: number;
};

export type MesFaturamento = {
  competencia: string;
  total: number;
  quantidade: number;
};

export type UsuarioAdmin = Profile & {
  rotas: number;
  pacotes: number;
  pagamentos: number;
  totalPago: number;
  ultimoPagamento: string | null;
};

export const METODOS: { valor: MetodoPagamento; label: string }[] = [
  { valor: "pix", label: "Pix" },
  { valor: "cartao", label: "Cartão" },
  { valor: "boleto", label: "Boleto" },
  { valor: "dinheiro", label: "Dinheiro" },
  { valor: "outro", label: "Outro" },
];

export const STATUS_LABEL: Record<StatusConta, string> = {
  ativo: "Ativo",
  suspenso: "Suspenso",
  bloqueado: "Bloqueado",
};
