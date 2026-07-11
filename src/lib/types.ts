export type Refeicao = "cafe" | "almoco" | "janta" | "outro";

export const REFEICOES: { value: Refeicao; label: string }[] = [
  { value: "cafe", label: "Café" },
  { value: "almoco", label: "Almoço" },
  { value: "janta", label: "Janta" },
  { value: "outro", label: "Outro" },
];

export function labelRefeicao(r: string | null): string {
  return REFEICOES.find((x) => x.value === r)?.label ?? "—";
}

export type Tipo = "rua" | "familia";

export const TIPOS: { value: Tipo; label: string }[] = [
  { value: "rua", label: "Morador de rua" },
  { value: "familia", label: "Família / Idoso" },
];

export function labelTipo(t: string | null): string {
  return TIPOS.find((x) => x.value === t)?.label ?? "—";
}

export const MOTIVOS: string[] = [
  "Desemprego",
  "Baixa renda",
  "Idoso(a) sem renda",
  "Doença na família",
];

export function simNao(b: boolean | null): string | null {
  if (b == null) return null;
  return b ? "Sim" : "Não";
}

export function formatarBRL(v: number | null): string | null {
  if (v == null) return null;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export type Acolhido = {
  id: string;
  nome: string;
  como_chamar: string | null;
  foto_path: string | null;
  idade_aproximada: number | null;
  data_nascimento: string | null;
  documento: string | null;
  cidade_origem: string | null;
  contato_referencia: string | null;
  restricoes_alimentares: string | null;
  observacoes: string | null;
  status: "ativo" | "inativo";
  created_by: string;
  created_at: string;
  // tipo + campos novos
  tipo: Tipo;
  artigo: string | null;
  tem_bo: boolean | null;
  autoriza_imagem: boolean | null;
  data_cadastro: string | null;
  bairro: string | null;
  cidade: string | null;
  paga_aluguel: boolean | null;
  valor_aluguel: number | null;
  casa_propria: boolean | null;
  filhos: number | null;
  beneficio: string | null;
  responsavel_legal: string | null;
  motivos: string[] | null;
};

export type AcolhidoResumo = Acolhido & {
  ultima_presenca: string | null;
  total_presencas: number;
};

export type Presenca = {
  id: string;
  acolhido_id: string;
  data: string;
  refeicao: Refeicao | null;
  observacao: string | null;
  created_by: string;
  created_at: string;
};

// Datas em fuso de São Paulo, formato ISO (yyyy-mm-dd) e exibição pt-BR.
export function hojeISO(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(new Date());
}

export function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}
