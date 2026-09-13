import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { diasRestantes, formatData, hoje } from "@/lib/format";
import { RotaCard } from "@/components/RotaCard";
import { comResumo } from "@/lib/data";
import type { AppConfig, Profile, Rota } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Toda ação daqui passa pela RLS: sem tipo = 'admin' o banco recusa. */
async function exigirAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("tipo")
    .eq("id", user!.id)
    .single<Pick<Profile, "tipo">>();

  if (perfil?.tipo !== "admin") redirect("/");
  return supabase;
}

export default async function AdminPage() {
  const supabase = await exigirAdmin();

  const [{ data: perfis }, { data: rotas }, { data: config }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase
      .from("rotas")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20),
    supabase.from("app_config").select("*").eq("id", true).maybeSingle<AppConfig>(),
  ]);

  const listaRotas = await comResumo(supabase, (rotas ?? []) as Rota[]);

  const porUsuario = new Map<string, number>();
  for (const rota of (rotas ?? []) as Rota[]) {
    porUsuario.set(rota.user_id, (porUsuario.get(rota.user_id) ?? 0) + 1);
  }

  async function renovar(formData: FormData) {
    "use server";

    const id = String(formData.get("id"));
    const supabase = await exigirAdmin();

    const { data: alvo } = await supabase
      .from("profiles")
      .select("assinatura_fim")
      .eq("id", id)
      .single<Pick<Profile, "assinatura_fim">>();

    // Assinatura vencida recomeça hoje; ativa soma 30 dias ao que falta.
    const base =
      alvo && diasRestantes(alvo.assinatura_fim) > 0 ? alvo.assinatura_fim : hoje();
    const nova = new Date(`${base.slice(0, 10)}T00:00:00`);
    nova.setDate(nova.getDate() + 30);

    await supabase
      .from("profiles")
      .update({ assinatura_fim: nova.toISOString().slice(0, 10) })
      .eq("id", id);

    revalidatePath("/admin");
  }

  async function alternarTipo(formData: FormData) {
    "use server";

    const id = String(formData.get("id"));
    const tipo = String(formData.get("tipo")) === "admin" ? "user" : "admin";
    const supabase = await exigirAdmin();

    await supabase.from("profiles").update({ tipo }).eq("id", id);
    revalidatePath("/admin");
  }

  async function bloquear(formData: FormData) {
    "use server";

    const id = String(formData.get("id"));
    const supabase = await exigirAdmin();

    const ontem = new Date();
    ontem.setDate(ontem.getDate() - 1);

    await supabase
      .from("profiles")
      .update({ assinatura_fim: ontem.toISOString().slice(0, 10) })
      .eq("id", id);

    revalidatePath("/admin");
  }

  async function salvarConfig(formData: FormData) {
    "use server";

    const min = Number(formData.get("min"));
    const max = Number(formData.get("max"));
    if (!Number.isInteger(min) || !Number.isInteger(max) || min < 1 || max < min) return;

    const supabase = await exigirAdmin();
    await supabase
      .from("app_config")
      .update({
        codigo_min_digitos: min,
        codigo_max_digitos: max,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);

    revalidatePath("/admin");
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-[19px] font-bold text-navy">
        Painel administrativo
      </h1>

      <section>
        <h2 className="mb-2.5 font-display text-[16px] font-bold text-navy">
          Usuários ({perfis?.length ?? 0})
        </h2>

        <div className="flex flex-col gap-2.5">
          {(perfis ?? []).map((perfil: Profile) => {
            const dias = diasRestantes(perfil.assinatura_fim);
            return (
              <div key={perfil.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-display text-[15px] font-bold text-navy-ink">
                      {perfil.nome || perfil.email}
                    </p>
                    <p className="truncate text-[12.5px] text-muted">{perfil.email}</p>
                  </div>
                  {perfil.tipo === "admin" && (
                    <span className="shrink-0 rounded-md bg-navy px-2 py-1 font-mono text-[10.5px] font-semibold text-white">
                      ADMIN
                    </span>
                  )}
                </div>

                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-[12.5px] text-muted">
                  <span>
                    Vencimento:{" "}
                    <b className="text-navy-ink">{formatData(perfil.assinatura_fim)}</b>
                  </span>
                  <span>
                    Dias restantes:{" "}
                    <b className={dias < 0 ? "text-danger" : "text-success"}>
                      {dias < 0 ? "vencida" : dias}
                    </b>
                  </span>
                  <span>
                    Rotas: <b className="text-navy-ink">{porUsuario.get(perfil.id) ?? 0}</b>
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={renovar}>
                    <input type="hidden" name="id" value={perfil.id} />
                    <BotaoAcao>Renovar +30 dias</BotaoAcao>
                  </form>

                  <form action={alternarTipo}>
                    <input type="hidden" name="id" value={perfil.id} />
                    <input type="hidden" name="tipo" value={perfil.tipo} />
                    <BotaoAcao>
                      {perfil.tipo === "admin" ? "Tornar usuário" : "Tornar admin"}
                    </BotaoAcao>
                  </form>

                  <form action={bloquear}>
                    <input type="hidden" name="id" value={perfil.id} />
                    <BotaoAcao tom="perigo">Bloquear acesso</BotaoAcao>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="mb-2.5 font-display text-[16px] font-bold text-navy">
          Rotas recentes (todas)
        </h2>
        {listaRotas.length === 0 ? (
          <p className="card p-5 text-center text-[13.5px] text-muted">
            Nenhuma rota registrada.
          </p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {listaRotas.map((rota) => (
              <RotaCard key={rota.id} rota={rota} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2.5 font-display text-[16px] font-bold text-navy">
          Configurações
        </h2>
        <form action={salvarConfig} className="card flex flex-col gap-3 p-5">
          <p className="text-[13px] font-semibold text-navy-ink">
            Validação do código do pacote
          </p>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-[12.5px] text-muted">Mínimo de dígitos</span>
              <input
                name="min"
                type="number"
                min={1}
                defaultValue={config?.codigo_min_digitos ?? 4}
                className="rounded-xl border border-line bg-surface-alt px-3.5 py-2.5 text-[15px] tabular-nums outline-none focus:border-navy"
              />
            </label>

            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-[12.5px] text-muted">Máximo de dígitos</span>
              <input
                name="max"
                type="number"
                min={1}
                defaultValue={config?.codigo_max_digitos ?? 20}
                className="rounded-xl border border-line bg-surface-alt px-3.5 py-2.5 text-[15px] tabular-nums outline-none focus:border-navy"
              />
            </label>
          </div>

          <button
            type="submit"
            className="rounded-xl bg-yellow px-4 py-3 font-display text-[14px] font-bold text-navy-ink transition hover:bg-yellow-soft"
          >
            Salvar configurações
          </button>
        </form>
      </section>
    </div>
  );
}

function BotaoAcao({
  children,
  tom = "neutro",
}: {
  children: React.ReactNode;
  tom?: "neutro" | "perigo";
}) {
  return (
    <button
      type="submit"
      className={`rounded-lg border px-2.5 py-1.5 text-[12.5px] font-semibold transition ${
        tom === "perigo"
          ? "border-danger-line bg-danger-bg text-danger"
          : "border-line text-navy hover:border-navy"
      }`}
    >
      {children}
    </button>
  );
}
