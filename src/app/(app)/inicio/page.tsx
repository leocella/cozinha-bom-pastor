import { createClient } from "@/lib/supabase/server";
import { assinarFotos } from "@/lib/photos";
import { hojeISO, formatarData, type AcolhidoResumo } from "@/lib/types";
import BuscaAcolhidos, { type ItemLista } from "@/components/BuscaAcolhidos";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const supabase = createClient();
  const hoje = hojeISO();

  const [{ data: acolhidos }, { data: presencasHoje }] = await Promise.all([
    supabase
      .from("vw_acolhidos")
      .select("*")
      .eq("status", "ativo")
      .order("nome", { ascending: true }),
    supabase.from("presencas").select("acolhido_id").eq("data", hoje),
  ]);

  const lista = (acolhidos ?? []) as AcolhidoResumo[];
  const idsHoje = new Set((presencasHoje ?? []).map((p) => p.acolhido_id));

  const fotos = await assinarFotos(lista.map((a) => a.foto_path));

  const itens: ItemLista[] = lista.map((a) => ({
    id: a.id,
    nome: a.nome,
    como_chamar: a.como_chamar,
    fotoUrl: a.foto_path ? fotos[a.foto_path] ?? null : null,
    ultima_presenca: a.ultima_presenca,
    veioHoje: idsHoje.has(a.id),
    tipo: a.tipo,
  }));

  const presencasHojeCount = (presencasHoje ?? []).length;
  const pessoasHojeCount = idsHoje.size;

  return (
    <div>
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="card bg-brand p-5 text-white">
          <p className="text-sm/5 opacity-90">Presenças de hoje</p>
          <p className="mt-1 font-display text-4xl font-bold tabular-nums">
            {presencasHojeCount}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-muted">Pessoas atendidas hoje</p>
          <p className="mt-1 font-display text-4xl font-bold tabular-nums text-brand">
            {pessoasHojeCount}
          </p>
        </div>
      </div>

      <div className="mb-3 flex items-baseline justify-between">
        <h1 className="text-xl font-bold">Acolhidos</h1>
        <span className="text-sm text-muted">{formatarData(hoje)}</span>
      </div>

      <BuscaAcolhidos itens={itens} />
    </div>
  );
}
