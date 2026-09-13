"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITENS = [
  { href: "/", label: "Rotas", icone: "M4 6h16M4 12h16M4 18h10" },
  { href: "/historico", label: "Histórico", icone: "M12 7v5l3 2M21 12a9 9 0 11-9-9" },
  { href: "/perfil", label: "Perfil", icone: "M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0" },
];

export function BottomNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const itens = isAdmin
    ? [...ITENS, { href: "/admin", label: "Admin", icone: "M12 3l8 4v6c0 4-3.4 7.3-8 8-4.6-.7-8-4-8-8V7l8-4z" }]
    : ITENS;

  return (
    <nav className="sticky bottom-0 z-20 border-t border-line-soft bg-white">
      <ul className="mx-auto flex max-w-[560px]">
        {itens.map((item) => {
          const ativo =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={ativo ? "page" : undefined}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11.5px] font-semibold transition ${
                  ativo ? "text-navy" : "text-muted"
                }`}
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={item.icone} />
                </svg>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
