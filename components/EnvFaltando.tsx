import { variaveisFaltando } from "@/lib/supabase/env";

export function EnvFaltando() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="card w-full max-w-[440px] p-6">
        <h1 className="font-display text-[19px] font-bold text-navy">
          Falta configurar o Supabase
        </h1>
        <p className="mt-2 text-[14px] text-muted">
          Estas variáveis de ambiente não chegaram no build:
        </p>
        <ul className="mt-3 flex flex-col gap-1.5">
          {variaveisFaltando().map((nome) => (
            <li
              key={nome}
              className="rounded-lg border border-danger-line bg-danger-bg px-3 py-2 font-mono text-[12.5px] font-medium text-danger"
            >
              {nome}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[13px] text-muted">
          Na Vercel: Settings → Environment Variables. Como são variáveis
          <code className="mx-1 font-mono text-[12px]">NEXT_PUBLIC_</code>, elas entram
          no bundle durante o build — depois de cadastrar é preciso refazer o deploy.
        </p>
      </div>
    </main>
  );
}
