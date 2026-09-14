"use server";

import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { diasRestantes, hoje, primeiroDiaDoMes, somarDias } from "@/lib/format";
import type { MetodoPagamento, StatusConta, Tipo } from "@/lib/types";

export type Resultado = { ok: boolean; erro?: string; aviso?: string };

/**
 * Nenhuma action confia no cliente: toda chamada revalida no servidor que quem
 * pediu é administrador. As que usam service_role dependem só desta checagem,
 * já que a chave ignora RLS.
 */
async function exigirAdmin() {
  const sessao = await getSessao();

  if (!sessao?.profile || sessao.profile.tipo !== "admin") {
    throw new Error("Acesso restrito a administradores.");
  }

  return sessao;
}

function falha(erro: unknown): Resultado {
  const msg = erro instanceof Error ? erro.message : String(erro);
  return { ok: false, erro: traduz(msg) };
}

function traduz(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered"))
    return "Já existe uma conta com esse e-mail.";
  if (m.includes("password should be")) return "A senha precisa de pelo menos 6 caracteres.";
  if (m.includes("invalid email")) return "E-mail inválido.";
  if (m.includes("service_role_key")) return "Falta SUPABASE_SERVICE_ROLE_KEY no ambiente.";
  return msg;
}

// --------------------------------------------------------------- usuários

export async function criarUsuario(dados: {
  nome: string;
  email: string;
  senha: string;
  tipo: Tipo;
  diasAssinatura: number;
}): Promise<Resultado> {
  try {
    await exigirAdmin();

    const nome = dados.nome.trim();
    const email = dados.email.trim().toLowerCase();

    if (!email || !dados.senha) return { ok: false, erro: "E-mail e senha são obrigatórios." };
    if (dados.senha.length < 6)
      return { ok: false, erro: "A senha precisa de pelo menos 6 caracteres." };

    const admin = createAdminClient();

    // email_confirm: a conta já nasce confirmada, sem depender de e-mail —
    // a contratação acontece pelo WhatsApp e o admin entrega a senha.
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: dados.senha,
      email_confirm: true,
      user_metadata: { nome: nome || email.split("@")[0] },
    });

    if (error) return falha(error.message);

    const fim = somarDias(hoje(), Math.max(1, dados.diasAssinatura));

    // O trigger já criou o profile; aqui só ajusta o que o admin escolheu.
    const { error: erroPerfil } = await admin
      .from("profiles")
      .update({
        nome: nome || email.split("@")[0],
        tipo: dados.tipo,
        status: "ativo",
        assinatura_inicio: hoje(),
        assinatura_fim: fim,
      })
      .eq("id", data.user.id);

    if (erroPerfil) return falha(erroPerfil.message);

    revalidatePath("/admin");
    return { ok: true };
  } catch (erro) {
    return falha(erro);
  }
}

export async function excluirUsuario(userId: string): Promise<Resultado> {
  try {
    const sessao = await exigirAdmin();

    if (sessao.user.id === userId)
      return { ok: false, erro: "Você não pode excluir a própria conta." };

    const admin = createAdminClient();
    const { error } = await admin.auth.admin.deleteUser(userId);

    if (error) return falha(error.message);

    revalidatePath("/admin");
    return { ok: true };
  } catch (erro) {
    return falha(erro);
  }
}

export async function definirStatus(
  userId: string,
  status: StatusConta,
): Promise<Resultado> {
  try {
    const sessao = await exigirAdmin();

    if (sessao.user.id === userId && status !== "ativo")
      return { ok: false, erro: "Você não pode suspender ou bloquear a própria conta." };

    const { error } = await sessao.supabase
      .from("profiles")
      .update({ status })
      .eq("id", userId);

    if (error) return falha(error.message);

    revalidatePath("/admin");
    return { ok: true };
  } catch (erro) {
    return falha(erro);
  }
}

export async function definirTipo(userId: string, tipo: Tipo): Promise<Resultado> {
  try {
    const sessao = await exigirAdmin();

    if (sessao.user.id === userId && tipo !== "admin")
      return { ok: false, erro: "Você perderia o acesso ao painel — peça a outro admin." };

    const { error } = await sessao.supabase
      .from("profiles")
      .update({ tipo })
      .eq("id", userId);

    if (error) return falha(error.message);

    revalidatePath("/admin");
    return { ok: true };
  } catch (erro) {
    return falha(erro);
  }
}

export async function renovarAssinatura(
  userId: string,
  dias = 30,
): Promise<Resultado> {
  try {
    const sessao = await exigirAdmin();

    const { data: alvo } = await sessao.supabase
      .from("profiles")
      .select("assinatura_fim")
      .eq("id", userId)
      .single<{ assinatura_fim: string }>();

    // Assinatura ativa soma ao que ainda falta; vencida recomeça de hoje.
    const base =
      alvo && diasRestantes(alvo.assinatura_fim) > 0 ? alvo.assinatura_fim : hoje();

    const { error } = await sessao.supabase
      .from("profiles")
      .update({ assinatura_fim: somarDias(base, dias), status: "ativo" })
      .eq("id", userId);

    if (error) return falha(error.message);

    revalidatePath("/admin");
    return { ok: true };
  } catch (erro) {
    return falha(erro);
  }
}

// ------------------------------------------------------------- pagamentos

export async function registrarPagamento(dados: {
  userId: string;
  valor: number;
  dataPagamento: string;
  competencia: string;
  metodo: MetodoPagamento;
  observacao?: string;
  renovarDias: number;
}): Promise<Resultado> {
  try {
    const sessao = await exigirAdmin();

    if (!(dados.valor > 0)) return { ok: false, erro: "Informe um valor maior que zero." };

    const { error } = await sessao.supabase.from("pagamentos").insert({
      user_id: dados.userId,
      valor: dados.valor,
      data_pagamento: dados.dataPagamento,
      competencia: primeiroDiaDoMes(dados.competencia),
      metodo: dados.metodo,
      observacao: dados.observacao?.trim() || null,
      registrado_por: sessao.user.id,
    });

    if (error) return falha(error.message);

    if (dados.renovarDias > 0) {
      const renovacao = await renovarAssinatura(dados.userId, dados.renovarDias);
      if (!renovacao.ok) {
        return { ok: true, aviso: `Pagamento salvo, mas a renovação falhou: ${renovacao.erro}` };
      }
    }

    revalidatePath("/admin");
    return { ok: true };
  } catch (erro) {
    return falha(erro);
  }
}

export async function excluirPagamento(id: string): Promise<Resultado> {
  try {
    const sessao = await exigirAdmin();

    const { error } = await sessao.supabase.from("pagamentos").delete().eq("id", id);
    if (error) return falha(error.message);

    revalidatePath("/admin");
    return { ok: true };
  } catch (erro) {
    return falha(erro);
  }
}

// ----------------------------------------------------------- configuração

export async function salvarConfig(min: number, max: number): Promise<Resultado> {
  try {
    const sessao = await exigirAdmin();

    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min)
      return { ok: false, erro: "Intervalo inválido: o máximo precisa ser maior ou igual ao mínimo." };

    const { error } = await sessao.supabase
      .from("app_config")
      .update({
        codigo_min_digitos: min,
        codigo_max_digitos: max,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    if (error) return falha(error.message);

    revalidatePath("/admin");
    return { ok: true };
  } catch (erro) {
    return falha(erro);
  }
}
