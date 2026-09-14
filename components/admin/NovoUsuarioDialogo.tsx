"use client";

import { useState, useTransition } from "react";
import { Alerta, Botao, Campo, CAMPO, Dialogo } from "@/components/ui";
import { criarUsuario } from "@/app/(app)/admin/actions";
import type { Tipo } from "@/lib/types";

/** Senha inicial legível, para o admin passar no WhatsApp sem confusão. */
function senhaSugerida(): string {
  const letras = "abcdefghjkmnpqrstuvwxyz";
  const sorteia = (set: string, n: number) =>
    Array.from({ length: n }, () => set[Math.floor(Math.random() * set.length)]).join("");
  return `rota${sorteia(letras, 3)}${sorteia("23456789", 3)}`;
}

export function NovoUsuarioDialogo({
  aberto,
  onFechar,
  onFeedback,
}: {
  aberto: boolean;
  onFechar: () => void;
  onFeedback: (tom: "ok" | "erro", msg: string) => void;
}) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState(senhaSugerida);
  const [tipo, setTipo] = useState<Tipo>("user");
  const [dias, setDias] = useState(30);
  const [erro, setErro] = useState<string | null>(null);
  const [pendente, iniciar] = useTransition();

  function fechar() {
    setErro(null);
    onFechar();
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);

    iniciar(async () => {
      const r = await criarUsuario({ nome, email, senha, tipo, diasAssinatura: dias });

      if (!r.ok) {
        setErro(r.erro ?? "Não deu para criar a conta.");
        return;
      }

      onFeedback("ok", `Conta criada para ${email}. Senha: ${senha}`);
      setNome("");
      setEmail("");
      setSenha(senhaSugerida());
      setTipo("user");
      setDias(30);
      onFechar();
    });
  }

  return (
    <Dialogo
      aberto={aberto}
      titulo="Novo usuário"
      descricao="A conta já nasce confirmada — é só entregar e-mail e senha para a pessoa."
      onFechar={fechar}
    >
      <form onSubmit={enviar} className="flex flex-col gap-3">
        <Campo label="Nome">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome de quem vai usar"
            className={CAMPO}
            autoComplete="off"
          />
        </Campo>

        <Campo label="E-mail">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
            placeholder="pessoa@empresa.com"
            className={CAMPO}
            autoComplete="off"
          />
        </Campo>

        <Campo label="Senha" hint="Anote antes de salvar — depois só dá para trocar, não para ver.">
          <div className="flex gap-2">
            <input
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              minLength={6}
              className={`${CAMPO} font-mono`}
              autoComplete="off"
            />
            <Botao
              type="button"
              variante="secundario"
              className="shrink-0"
              onClick={() => setSenha(senhaSugerida())}
            >
              Gerar
            </Botao>
          </div>
        </Campo>

        <div className="flex gap-3">
          <Campo label="Tipo">
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as Tipo)}
              className={CAMPO}
            >
              <option value="user">Usuário</option>
              <option value="admin">Administrador</option>
            </select>
          </Campo>

          <Campo label="Assinatura (dias)">
            <input
              value={dias}
              onChange={(e) => setDias(Number(e.target.value))}
              type="number"
              min={1}
              className={CAMPO}
            />
          </Campo>
        </div>

        {erro && <Alerta tom="erro">{erro}</Alerta>}

        <div className="mt-1 flex gap-2">
          <Botao type="button" variante="secundario" className="flex-1" onClick={fechar}>
            Cancelar
          </Botao>
          <Botao type="submit" className="flex-1" disabled={pendente}>
            {pendente ? "Criando…" : "Criar conta"}
          </Botao>
        </div>
      </form>
    </Dialogo>
  );
}
