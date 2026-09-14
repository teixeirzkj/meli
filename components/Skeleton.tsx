export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-xl bg-[#e8edf5] ${className}`}
    />
  );
}

/** Esqueleto genérico: cartões empilhados, na altura do conteúdo real. */
export function ListaSkeleton({ linhas = 4 }: { linhas?: number }) {
  return (
    <div className="flex flex-col gap-2.5" role="status" aria-label="Carregando">
      {Array.from({ length: linhas }).map((_, i) => (
        <Skeleton key={i} className="h-[86px]" />
      ))}
    </div>
  );
}
