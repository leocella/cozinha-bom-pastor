import { createClient } from "@/lib/supabase/server";
import { hojeISO, labelRefeicao, labelTipo, simNao } from "@/lib/types";

function csvEscape(v: unknown): string {
  let s = v == null ? "" : String(v);
  // Blindagem contra CSV formula injection: células que começam com =, +, -, @
  // (ou tab/CR) podem ser executadas como fórmula pelo Excel/Sheets ao abrir o
  // arquivo. Prefixamos com apóstrofo para forçar interpretação como texto.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[";\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: unknown[][]): string {
  const linhas = [headers.join(";")];
  for (const r of rows) linhas.push(r.map(csvEscape).join(";"));
  // BOM para acentuação correta no Excel
  return "﻿" + linhas.join("\r\n");
}

export async function GET(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Não autorizado", { status: 401 });
  }

  const url = new URL(request.url);
  const tipo = url.searchParams.get("tipo") ?? "presencas";
  const publicoParam = url.searchParams.get("publico");
  const publico =
    publicoParam === "rua" || publicoParam === "familia" ? publicoParam : null;

  let csv = "";
  let nomeArquivo = "export.csv";

  if (tipo === "acolhidos") {
    let query = supabase.from("acolhidos").select("*").order("nome");
    if (publico) query = query.eq("tipo", publico);
    const { data } = await query;

    const rows = (data ?? []).map((a) => [
      labelTipo(a.tipo),
      a.nome,
      a.como_chamar,
      a.idade_aproximada,
      a.data_nascimento,
      a.documento,
      a.cidade_origem,
      a.contato_referencia,
      a.restricoes_alimentares,
      a.bairro,
      a.cidade,
      simNao(a.casa_propria),
      simNao(a.paga_aluguel),
      a.valor_aluguel,
      a.filhos,
      a.beneficio,
      a.artigo,
      simNao(a.tem_bo),
      simNao(a.autoriza_imagem),
      a.responsavel_legal,
      (a.motivos ?? []).join(", "),
      a.data_cadastro,
      a.observacoes,
      a.status,
    ]);
    csv = toCsv(
      [
        "Tipo",
        "Nome",
        "Como chamar",
        "Idade aproximada",
        "Nascimento",
        "Documento",
        "Cidade de origem",
        "Contato de referência",
        "Restrições alimentares",
        "Bairro",
        "Cidade",
        "Casa própria",
        "Paga aluguel",
        "Valor do aluguel",
        "Filhos",
        "Benefício",
        "Artigo",
        "B.O.",
        "Autoriza imagem",
        "Responsável legal",
        "Motivos",
        "Data do cadastro",
        "Observações",
        "Status",
      ],
      rows,
    );
    nomeArquivo = `cadastros${publico ? "-" + publico : ""}-${hojeISO()}.csv`;
  } else {
    const { data } = await supabase
      .from("presencas")
      .select("data, refeicao, observacao, acolhidos ( nome, como_chamar )")
      .order("data", { ascending: false });
    const rows = (data ?? []).map((p) => {
      const a = (p.acolhidos ?? null) as {
        nome?: string;
        como_chamar?: string | null;
      } | null;
      return [
        p.data,
        a?.nome ?? "",
        a?.como_chamar ?? "",
        labelRefeicao(p.refeicao),
        p.observacao ?? "",
      ];
    });
    csv = toCsv(
      ["Data", "Nome", "Como chamar", "Refeição", "Observação"],
      rows,
    );
    nomeArquivo = `presencas-${hojeISO()}.csv`;
  }

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomeArquivo}"`,
    },
  });
}
