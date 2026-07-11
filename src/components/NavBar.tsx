"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarCheck, BarChart3, LogOut, UtensilsCrossed } from "lucide-react";

const itens = [
  { href: "/inicio", label: "Início", icon: Home },
  { href: "/hoje", label: "Hoje", icon: CalendarCheck },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

export default function NavBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link href="/inicio" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl2 bg-brand-soft text-brand">
            <UtensilsCrossed size={20} />
          </span>
          <span className="hidden font-display text-lg font-bold sm:block">
            Cozinha Comunitária
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {itens.map(({ href, label, icon: Icon }) => {
            const ativo = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 rounded-xl2 px-3 py-2 text-sm font-medium transition-colors ${
                  ativo
                    ? "bg-brand text-white"
                    : "text-muted hover:bg-brand-soft hover:text-brand"
                }`}
              >
                <Icon size={18} />
                <span className="hidden sm:block">{label}</span>
              </Link>
            );
          })}
          <form action="/auth/sign-out" method="post">
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl2 px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-danger-soft hover:text-danger"
              title="Sair"
            >
              <LogOut size={18} />
              <span className="hidden sm:block">Sair</span>
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}
