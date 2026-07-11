"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, UserPlus, ChevronRight } from "lucide-react";
import Avatar from "@/components/Avatar";
import BotaoPresenca from "@/components/BotaoPresenca";
import { formatarData } from "@/lib/types";

export type ItemLista = {
  id: string;
  nome: string;
  como_chamar: string | null;
  fotoUrl: string | null;
  ultima_presenca: string | null;
  veioHoje: boolean;
  tipo: "rua" | "familia";
};

const ABAS: { value: "todos" | "rua" | "familia"; label: string }[] = [
  { value: "todos", label: "Todos" },
  { value: "rua", label: "Rua" },
  { value: "familia", label: "Famílias" },
];

export default function BuscaAcolhidos({ itens }: { itens: ItemLista[] }) {
  const [q, setQ] = useState("");
  const [filtroTipo, setFiltroTipo] = useState<"todos" | "rua" | "familia">(
    "todos",
  );

  const filtrados = useMemo(() => {
    const termo = q.trim().toLowerCase();
    return itens.filter((i) => {
      if (filtroTipo !== "todos" && i.tipo !== filtroTipo) return false;
      if (!termo) return true;
      return (
        i.nome.toLowerCase().includes(termo) ||
        (i.como_chamar ?? "").toLowerCase().includes(termo)
      );
    });
  }, [q, itens, filtroTipo]);

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={20}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            inputMode="search"
            placeholder="Buscar por nome ou apelido…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="field pl-11"
            aria-label="Buscar acolhido"
          />
        </div>
        <Link href="/acolhidos/novo" className="btn-brand whitespace-nowrap">
          <UserPlus size={20} /> Novo cadastro
        </Link>
      </div>

      <div className="mb-3 flex gap-2">
        {ABAS.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => setFiltroTipo(a.value)}
            aria-pressed={filtroTipo === a.value}
            className={
              filtroTipo === a.value
                ? "rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white"
                : "rounded-full bg-line px-4 py-1.5 text-sm font-medium text-muted"
            }
          >
            {a.label}
          </button>
        ))}
      </div>

      {filtrados.length === 0 ? (
        <div className="card p-8 text-center">
          {q || filtroTipo !== "todos" ? (
            <p className="text-muted">
              Ninguém encontrado com esse filtro. Ajuste a busca ou a aba de
              tipo.
            </p>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <p className="text-muted">Nenhuma pessoa cadastrada ainda.</p>
              <Link href="/acolhidos/novo" className="btn-brand">
                <UserPlus size={20} /> Cadastrar a primeira pessoa
              </Link>
            </div>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtrados.map((i) => (
            <li key={i.id} className="card flex items-center gap-3 p-3">
              <Link
                href={`/acolhidos/${i.id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                <Avatar nome={i.nome} fotoUrl={i.fotoUrl} size={56} />
                <span className="min-w-0">
                  <span className="flex items-center gap-2">
                    <span className="truncate font-semibold">
                      {i.como_chamar || i.nome}
                    </span>
                    <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
                      {i.tipo === "familia" ? "Família" : "Rua"}
                    </span>
                  </span>
                  <span className="block truncate text-sm text-muted">
                    Última presença: {formatarData(i.ultima_presenca)}
                  </span>
                </span>
                <ChevronRight
                  size={18}
                  className="ml-auto shrink-0 text-line"
                />
              </Link>
              <div className="shrink-0">
                <BotaoPresenca acolhidoId={i.id} veioHoje={i.veioHoje} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
