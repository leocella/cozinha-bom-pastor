import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { assinarFotos } from "@/lib/photos";
import { hojeISO, formatarData, labelRefeicao } from "@/lib/types";
import Avatar from "@/components/Avatar";

export const dynamic = "force-dynamic";

type LinhaHoje = {
  id: string;
  refeicao: string | null;
  created_at: string;
  acolhidos: { id: string; nome: string; como_chamar: string | null; foto_path: string | null } | null;
};

export default async function HojePage() {
  const supabase = createClient();
  const hoje = hojeISO();

  const { data } = await supabase
    .from("presencas")
    .select(
      "id, refeicao, created_at, acolhidos ( id, nome, como_chamar, foto_path )",
    )
    .eq("data", hoje)
    .order("created_at", { ascending: false });

  const linhas = (data ?? []) as unknown as LinhaHoje[];
  const fotos = await assinarFotos(linhas.map((l) => l.acolhidos?.foto_path));

  return (
    <div>
      <div className="mb-6 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">Presenças de hoje</h1>
        <span className="text-sm text-muted">{formatarData(hoje)}</span>
      </div>

      <div className="mb-4 card bg-brand p-5 text-white">
        <p className="text-sm opacity-90">Total de presenças</p>
        <p className="mt-1 font-display text-4xl font-bold tabular-nums">
          {linhas.length}
        </p>
      </div>

      {linhas.length === 0 ? (
        <div className="card p-8 text-center text-muted">
          Ninguém registrado hoje ainda. Marque a presença pela tela{" "}
          <Link href="/inicio" className="font-medium text-brand underline">
            Início
          </Link>
          .
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {linhas.map((l) => {
            const a = l.acolhidos;
            const hora = new Date(l.created_at).toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "America/Sao_Paulo",
            });
            return (
              <li key={l.id} className="card flex items-center gap-3 p-3">
                <Avatar
                  nome={a?.nome ?? "?"}
                  fotoUrl={a?.foto_path ? fotos[a.foto_path] ?? null : null}
                  size={48}
                />
                <Link
                  href={a ? `/acolhidos/${a.id}` : "#"}
                  className="min-w-0 flex-1"
                >
                  <span className="block truncate font-semibold">
                    {a?.como_chamar || a?.nome}
                  </span>
                  <span className="block text-sm text-muted">
                    {hora} · {labelRefeicao(l.refeicao)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
