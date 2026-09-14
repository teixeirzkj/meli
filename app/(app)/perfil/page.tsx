import { revalidatePath } from "next/cache";
import { getSessao } from "@/lib/auth";
import { diasRestantes, formatData } from "@/lib/format";
import { BotaoInstalar } from "@/components/BotaoInstalar";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const sessao = await getSessao();
  const profile = sessao?.profile;

  if (!profile) return null;

  async function salvarNome(formData: FormData) {
    "use server";

    const nome = String(formData.get("nome") ?? "").trim();
    if (!nome) return;

    const sessao = await getSessao();
    if (!sessao) return;

    await sessao.supabase.from("profiles").update({ nome }).eq("id", sessao.userId);
    revalidatePath("/perfil");
  }

  const dias = diasRestantes(profile.assinatura_fim);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-display text-[19px] font-bold text-navy">Perfil</h1>

      <form action={salvarNome} className="card flex flex-col gap-3 p-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-navy-ink">Nome</span>
          <input
            name="nome"
            defaultValue={profile.nome}
            maxLength={80}
            className="rounded-xl border border-line bg-surface-alt px-3.5 py-3 text-[15px] outline-none focus:border-navy"
          />
        </label>

        <div>
          <p className="text-[13px] font-semibold text-navy-ink">E-mail</p>
          <p className="mt-1 text-[14px] text-muted">{profile.email}</p>
        </div>

        <button
          type="submit"
          className="rounded-xl bg-yellow px-4 py-3 font-display text-[14px] font-bold text-navy-ink transition hover:bg-yellow-soft"
        >
          Salvar
        </button>
      </form>

      <section className="card p-5">
        <h2 className="font-display text-[16px] font-bold text-navy">Assinatura</h2>

        <dl className="mt-3 flex flex-col gap-2 text-[14px]">
          <div className="flex justify-between">
            <dt className="text-muted">Tipo de usuário</dt>
            <dd className="font-semibold text-navy-ink">
              {profile.tipo === "admin" ? "Administrador" : "Usuário"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Início</dt>
            <dd className="font-semibold text-navy-ink">
              {formatData(profile.assinatura_inicio)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Vencimento</dt>
            <dd className="font-semibold text-navy-ink">
              {formatData(profile.assinatura_fim)}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">Dias restantes</dt>
            <dd
              className={`font-display font-bold tabular-nums ${
                dias < 0 ? "text-danger" : dias <= 5 ? "text-warn" : "text-success"
              }`}
            >
              {dias < 0 ? "vencida" : dias}
            </dd>
          </div>
        </dl>
      </section>

      <BotaoInstalar />

      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="w-full rounded-xl border border-danger-line bg-danger-bg px-4 py-3 font-display text-[14px] font-bold text-danger"
        >
          Sair da conta
        </button>
      </form>
    </div>
  );
}
