import { Download, Users, CalendarCheck, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { hojeISO } from "@/lib/types";

export const dynamic = "force-dynamic";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

export default async function RelatoriosPage() {
  const supabase = createClient();
  const hoje = hojeISO(); // yyyy-mm-dd
  const [ano, mes] = hoje.split("-").map(Number);
  const inicio = `${ano}-${String(mes).padStart(2, "0")}-01`;
  const proxMes = mes === 12 ? `${ano + 1}-01-01` : `${ano}-${String(mes + 1).padStart(2, "0")}-01`;

  const [{ data: presMes }, { count: totalAtivos }] = await Promise.all([
    supabase
      .from("presencas")
      .select("acolhido_id, data")
      .gte("data", inicio)
      .lt("data", proxMes),
    supabase
      .from("acolhidos")
      .select("id", { count: "exact", head: true })
      .eq("status", "ativo"),
  ]);

  const presencas = presMes ?? [];
  const totalPresencas = presencas.length;
  const pessoasUnicas = new Set(presencas.map((p) => p.acolhido_id)).size;

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold">Relatórios</h1>
      <p className="mb-6 text-muted">
        Resumo de {MESES[mes - 1]} de {ano}.
      </p>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="card p-5">
          <CalendarCheck className="mb-2 text-brand" size={22} />
          <p className="text-sm text-muted">Presenças no mês</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">
            {totalPresencas}
          </p>
        </div>
        <div className="card p-5">
          <UserRound className="mb-2 text-brand" size={22} />
          <p className="text-sm text-muted">Pessoas atendidas no mês</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">
            {pessoasUnicas}
          </p>
        </div>
        <div className="card p-5">
          <Users className="mb-2 text-brand" size={22} />
          <p className="text-sm text-muted">Cadastros ativos</p>
          <p className="mt-1 font-display text-3xl font-bold tabular-nums">
            {totalAtivos ?? 0}
          </p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-1 text-lg font-bold">Backup / exportação</h2>
        <p className="mb-4 text-muted">
          Baixe uma planilha (CSV) com todos os cadastros e presenças para
          guardar no HD externo ou usar em prestação de contas. Abre no Excel e
          no Google Planilhas.
        </p>
        <div className="flex flex-wrap gap-3">
          <a href="/api/export?tipo=presencas" className="btn-brand">
            <Download size={20} /> Baixar presenças (CSV)
          </a>
          <a href="/api/export?tipo=acolhidos" className="btn-ghost">
            <Download size={20} /> Cadastros — todos (CSV)
          </a>
          <a href="/api/export?tipo=acolhidos&publico=rua" className="btn-ghost">
            <Download size={20} /> Cadastros — Rua (CSV)
          </a>
          <a
            href="/api/export?tipo=acolhidos&publico=familia"
            className="btn-ghost"
          >
            <Download size={20} /> Cadastros — Famílias (CSV)
          </a>
        </div>
      </div>
    </div>
  );
}
