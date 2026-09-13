export type Tipo = "user" | "admin";
export type RotaStatus = "em_conferencia" | "finalizada";

export type Profile = {
  id: string;
  email: string;
  nome: string;
  tipo: Tipo;
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

export type AppConfig = {
  id: boolean;
  codigo_min_digitos: number;
  codigo_max_digitos: number;
  updated_at: string;
};

export type RotaResumo = Rota & {
  conferidos: number;
  excedentes: number;
  faltantes: number;
};
