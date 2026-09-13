import Image from "next/image";

export function Header({ nome, isAdmin }: { nome: string; isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-20 border-b border-line-soft bg-white">
      <div className="mx-auto flex max-w-[560px] items-center gap-3 px-4 py-3">
        <Image
          src="/logo-rotas.png"
          alt=""
          width={36}
          height={36}
          className="rounded-[10px] object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-[15px] font-bold text-navy">
            {nome || "Rotas"}
          </p>
          <p className="text-[12px] text-muted">Conferência de rotas e pacotes</p>
        </div>
        {isAdmin && (
          <span className="rounded-md bg-navy px-2 py-1 font-mono text-[10.5px] font-semibold tracking-wide text-white">
            ADMIN
          </span>
        )}
        <form action="/auth/signout" method="post">
          <button
            type="submit"
            className="rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] font-semibold text-navy transition hover:bg-surface-alt"
          >
            Sair
          </button>
        </form>
      </div>
    </header>
  );
}
