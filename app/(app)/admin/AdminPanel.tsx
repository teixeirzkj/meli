"use client";

import { useMemo, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KpiTile } from "@/components/admin/KpiTile";
import { FaturamentoChart } from "@/components/admin/FaturamentoChart";
import { UsuarioCard } from "@/components/admin/UsuarioCard";
import { NovoUsuarioDialogo } from "@/components/admin/NovoUsuarioDialogo";
import { PagamentoDialogo } from "@/components/admin/PagamentoDialogo";
import { RotaCard } from "@/components/RotaCard";
import { Alerta, Botao, Campo, CAMPO, Dialogo } from "@/components/ui";
import {
  diasRestantes,
  formatData,
  mesAtual,
  mesCurto,
  moeda,
  moedaCurta,
} from "@/lib/format";
import { excluirPagamento, excluirUsuario, salvarConfig } from "./actions";
import type {
  AppConfig,
  MesFaturamento,
  Pagamento,
  RotaResumo,
  UsuarioAdmin,
} from "@/lib/types";
import { METODOS } from "@/lib/types";

type Aba = "visao" | "usuarios" | "pagamentos" | "rotas" | "config";

const ABAS: { id: Aba; label: string }[] = [
  { id: "visao", label: "Visão geral" },
  { id: "usuarios", label: "Usuários" },
  { id: "pagamentos", label: "Pagamentos" },
  { id: "rotas", label: "Rotas" },
  { id: "config", label: "Ajustes" },
];

export function AdminPanel({
  usuarios,
  pagamentos,
  rotas,
  faturamento,
  config,
  meuId,
  podeCriarConta,
  migracaoPendente,
}: {
  usuarios: UsuarioAdmin[];
  pagamentos: Pagamento[];
  rotas: RotaResumo[];
  faturamento: MesFaturamento[];
  config: AppConfig;
  meuId: string;
  podeCriarConta: boolean;
  migracaoPendente: boolean;
}) {
  const [aba, setAba] = useState<Aba>("visao");
  const [busca, setBusca] = useState("");
  const [novoAberto, setNovoAberto] = useState(false);
  const [pagamentoDe, setPagamentoDe] = useState<UsuarioAdmin | null>(null);
  const [excluindo, setExcluindo] = useState<UsuarioAdmin | null>(null);
  const [feedback, setFeedback] = useState<{ tom: "ok" | "erro"; msg: string } | null>(null);
  const [pendente, iniciar] = useTransition();

  const nomePorId = useMemo(
    () => new Map(usuarios.map((u) => [u.id, u.nome || u.email])),
    [usuarios],
  );

  const metricas = useMemo(() => {
    const competencia = mesAtual();
    const doMes = pagamentos.filter((p) => p.competencia.slice(0, 10) === competencia);

    return {
      recebidoMes: doMes.reduce((s, p) => s + p.valor, 0),
      qtdMes: doMes.length,
      totalGeral: pagamentos.reduce((s, p) => s + p.valor, 0),
      ativos: usuarios.filter(
        (u) => u.status === "ativo" && diasRestantes(u.assinatura_fim) >= 0,
      ).length,
      vencendo: usuarios.filter((u) => {
        const dias = diasRestantes(u.assinatura_fim);
        return u.status === "ativo" && dias >= 0 && dias <= 7;
      }).length,
      vencidos: usuarios.filter(
        (u) => u.status !== "ativo" || diasRestantes(u.assinatura_fim) < 0,
      ).length,
    };
  }, [pagamentos, usuarios]);

  const usuariosFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return usuarios;
    return usuarios.filter(
      (u) =>
        u.nome.toLowerCase().includes(termo) || u.email.toLowerCase().includes(termo),
    );
  }, [busca, usuarios]);

  function avisar(tom: "ok" | "erro", msg: string) {
    setFeedback({ tom, msg });
    window.setTimeout(() => setFeedback(null), 3200);
  }

  function confirmarExclusao() {
    if (!excluindo) return;
    const alvo = excluindo;

    iniciar(async () => {
      const r = await excluirUsuario(alvo.id);
      setExcluindo(null);
      avisar(r.ok ? "ok" : "erro", r.ok ? "Conta excluída." : r.erro!);
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[20px] font-bold tracking-tight text-navy">
            Administração
          </h1>
          <p className="mt-0.5 text-[12.5px] text-muted">
            {usuarios.length} {usuarios.length === 1 ? "conta" : "contas"} ·{" "}
            {moedaCurta(metricas.totalGeral)} recebidos no total
          </p>
        </div>

        <Botao onClick={() => setNovoAberto(true)} disabled={!podeCriarConta}>
          + Novo usuário
        </Botao>
      </header>

      {migracaoPendente && (
        <Alerta tom="alerta">
          Rode a migration <b>0002_pagamentos_status.sql</b> no Supabase para ligar o
          módulo de pagamentos. O resto do painel funciona sem ela.
        </Alerta>
      )}

      {!podeCriarConta && (
        <Alerta tom="alerta">
          Criar conta precisa da variável <b>SUPABASE_SERVICE_ROLE_KEY</b> no servidor.
          As demais ações do painel funcionam normalmente.
        </Alerta>
      )}

      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <Alerta tom={feedback.tom === "ok" ? "ok" : "erro"}>{feedback.msg}</Alerta>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="-mx-4 overflow-x-auto px-4">
        <div className="flex w-max gap-1.5 rounded-xl bg-white p-1 ring-1 ring-line-soft">
          {ABAS.map((item) => (
            <button
              key={item.id}
              onClick={() => setAba(item.id)}
              className={`relative rounded-lg px-3 py-2 font-display text-[13px] font-bold transition ${
                aba === item.id ? "text-white" : "text-muted hover:text-navy"
              }`}
            >
              {aba === item.id && (
                <motion.span
                  layoutId="aba-ativa"
                  className="absolute inset-0 rounded-lg bg-navy"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <span className="relative">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <AnimatePresence mode="wait">
        <motion.div
          key={aba}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="flex flex-col gap-4"
        >
          {aba === "visao" && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <KpiTile
                  label={`Recebido em ${mesCurto(mesAtual())}`}
                  valor={moedaCurta(metricas.recebidoMes)}
                  detalhe={`${metricas.qtdMes} ${metricas.qtdMes === 1 ? "pagamento" : "pagamentos"}`}
                  tom="ok"
                  indice={0}
                />
                <KpiTile
                  label="Contas ativas"
                  valor={metricas.ativos}
                  detalhe={`de ${usuarios.length} no total`}
                  indice={1}
                />
                <KpiTile
                  label="Vencendo em 7 dias"
                  valor={metricas.vencendo}
                  detalhe="assinaturas a renovar"
                  tom={metricas.vencendo > 0 ? "alerta" : "neutro"}
                  indice={2}
                />
                <KpiTile
                  label="Sem acesso"
                  valor={metricas.vencidos}
                  detalhe="vencidas, suspensas ou bloqueadas"
                  tom={metricas.vencidos > 0 ? "erro" : "neutro"}
                  indice={3}
                />
              </div>

              <FaturamentoChart dados={faturamento} />

              <section className="card p-5">
                <h2 className="font-display text-[15px] font-bold text-navy">
                  Renovações mais próximas
                </h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {[...usuarios]
                    .filter((u) => u.status !== "bloqueado")
                    .sort(
                      (a, b) =>
                        diasRestantes(a.assinatura_fim) - diasRestantes(b.assinatura_fim),
                    )
                    .slice(0, 5)
                    .map((usuario) => {
                      const dias = diasRestantes(usuario.assinatura_fim);
                      return (
                        <li
                          key={usuario.id}
                          className="flex items-center justify-between gap-3 border-b border-line-soft pb-2 last:border-0 last:pb-0"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-semibold text-navy-ink">
                              {usuario.nome || usuario.email}
                            </p>
                            <p className="text-[11.5px] text-muted">
                              vence {formatData(usuario.assinatura_fim)}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 font-display text-[13px] font-bold tabular-nums ${
                              dias < 0
                                ? "text-danger"
                                : dias <= 7
                                  ? "text-warn"
                                  : "text-success"
                            }`}
                          >
                            {dias < 0 ? "vencida" : `${dias}d`}
                          </span>
                        </li>
                      );
                    })}
                  {usuarios.length === 0 && (
                    <li className="py-3 text-center text-[13px] text-muted">
                      Nenhuma conta ainda.
                    </li>
                  )}
                </ul>
              </section>
            </>
          )}

          {aba === "usuarios" && (
            <>
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar por nome ou e-mail"
                className={CAMPO}
              />

              <div className="flex flex-col gap-2.5">
                {usuariosFiltrados.map((usuario, i) => (
                  <UsuarioCard
                    key={usuario.id}
                    usuario={usuario}
                    ehVoce={usuario.id === meuId}
                    indice={i}
                    onPagamento={() => setPagamentoDe(usuario)}
                    onExcluir={() => setExcluindo(usuario)}
                    onFeedback={avisar}
                  />
                ))}

                {usuariosFiltrados.length === 0 && (
                  <p className="card p-6 text-center text-[13.5px] text-muted">
                    Nenhuma conta encontrada.
                  </p>
                )}
              </div>
            </>
          )}

          {aba === "pagamentos" && (
            <>
              <div className="grid grid-cols-2 gap-2.5">
                <KpiTile
                  label="Total recebido"
                  valor={moedaCurta(metricas.totalGeral)}
                  detalhe={`${pagamentos.length} ${pagamentos.length === 1 ? "registro" : "registros"}`}
                  tom="ok"
                />
                <KpiTile
                  label={`Em ${mesCurto(mesAtual())}`}
                  valor={moedaCurta(metricas.recebidoMes)}
                  detalhe={`${metricas.qtdMes} no mês`}
                />
              </div>

              <ul className="flex flex-col gap-2">
                {pagamentos.map((pagamento, i) => (
                  <motion.li
                    key={pagamento.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i, 8) * 0.03 }}
                    className="card flex items-center gap-3 p-3.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-navy-ink">
                        {nomePorId.get(pagamento.user_id) ?? "conta removida"}
                      </p>
                      <p className="text-[11.5px] text-muted">
                        {formatData(pagamento.data_pagamento)} ·{" "}
                        {METODOS.find((m) => m.valor === pagamento.metodo)?.label} ·
                        competência {mesCurto(pagamento.competencia)}
                      </p>
                      {pagamento.observacao && (
                        <p className="mt-0.5 truncate text-[11.5px] text-muted">
                          {pagamento.observacao}
                        </p>
                      )}
                    </div>

                    <p className="shrink-0 font-display text-[14px] font-bold tabular-nums text-success">
                      {moeda(pagamento.valor)}
                    </p>

                    <button
                      onClick={() =>
                        iniciar(async () => {
                          const r = await excluirPagamento(pagamento.id);
                          avisar(r.ok ? "ok" : "erro", r.ok ? "Pagamento removido." : r.erro!);
                        })
                      }
                      disabled={pendente}
                      aria-label="Remover pagamento"
                      className="shrink-0 rounded-lg border border-line px-2 py-1 text-[11.5px] font-semibold text-danger transition hover:bg-danger-bg disabled:opacity-50"
                    >
                      Remover
                    </button>
                  </motion.li>
                ))}

                {pagamentos.length === 0 && (
                  <li className="card p-6 text-center text-[13.5px] text-muted">
                    Nenhum pagamento registrado. Use o botão <b>Pagamento</b> no cartão de
                    um usuário.
                  </li>
                )}
              </ul>
            </>
          )}

          {aba === "rotas" && (
            <div className="flex flex-col gap-2.5">
              {rotas.map((rota) => (
                <RotaCard key={rota.id} rota={rota} />
              ))}
              {rotas.length === 0 && (
                <p className="card p-6 text-center text-[13.5px] text-muted">
                  Nenhuma rota registrada ainda.
                </p>
              )}
            </div>
          )}

          {aba === "config" && (
            <form
              className="card flex flex-col gap-3 p-5"
              action={(formData) =>
                iniciar(async () => {
                  const r = await salvarConfig(
                    Number(formData.get("min")),
                    Number(formData.get("max")),
                  );
                  avisar(r.ok ? "ok" : "erro", r.ok ? "Configuração salva." : r.erro!);
                })
              }
            >
              <p className="text-[13px] font-semibold text-navy-ink">
                Validação do código do pacote
              </p>

              <div className="flex gap-3">
                <Campo label="Mínimo de dígitos">
                  <input
                    name="min"
                    type="number"
                    min={1}
                    defaultValue={config.codigo_min_digitos}
                    className={CAMPO}
                  />
                </Campo>
                <Campo label="Máximo de dígitos">
                  <input
                    name="max"
                    type="number"
                    min={1}
                    defaultValue={config.codigo_max_digitos}
                    className={CAMPO}
                  />
                </Campo>
              </div>

              <p className="text-[11.5px] text-muted">
                Vale para todos os usuários na hora de bipar o pacote.
              </p>

              <Botao type="submit" disabled={pendente}>
                {pendente ? "Salvando…" : "Salvar configuração"}
              </Botao>
            </form>
          )}
        </motion.div>
      </AnimatePresence>

      <NovoUsuarioDialogo
        aberto={novoAberto}
        onFechar={() => setNovoAberto(false)}
        onFeedback={avisar}
      />

      <PagamentoDialogo
        usuario={pagamentoDe}
        onFechar={() => setPagamentoDe(null)}
        onFeedback={avisar}
      />

      <Dialogo
        aberto={Boolean(excluindo)}
        titulo="Excluir conta"
        descricao={`${excluindo?.email} perde o acesso e todas as rotas, pacotes e pagamentos dessa conta somem junto. Não dá para desfazer.`}
        onFechar={() => setExcluindo(null)}
      >
        <div className="flex gap-2">
          <Botao variante="secundario" className="flex-1" onClick={() => setExcluindo(null)}>
            Cancelar
          </Botao>
          <Botao
            variante="perigo"
            className="flex-1"
            onClick={confirmarExclusao}
            disabled={pendente}
          >
            {pendente ? "Excluindo…" : "Excluir"}
          </Botao>
        </div>
      </Dialogo>
    </div>
  );
}
