import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { assinarFoto } from "@/lib/photos";
import {
  formatarData,
  labelRefeicao,
  labelTipo,
  simNao,
  formatarBRL,
  hojeISO,
  type Acolhido,
  type Presenca,
} from "@/lib/types";
import Avatar from "@/components/Avatar";
import BotaoPresenca from "@/components/BotaoPresenca";
import BotaoStatus from "@/components/BotaoStatus";
import FormPresenca from "@/components/FormPresenca";
import { registrarPresencaForm } from "@/lib/actions/presencas";

export const dynamic = "force-dynamic";

function Campo({ rotulo, valor }: { rotulo: string; valor: string | null }) {
  if (!valor) return null;
  return (
    <div>
      <dt className="text-sm text-muted">{rotulo}</dt>
      <dd className="font-medium">{valor}</dd>
    </div>
  );
}

export default async function DetalheAcolhidoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: aData }, { data: presData }, { data: hojeData }] =
    await Promise.all([
      supabase.from("acolhidos").select("*").eq("id", params.id).maybeSingle(),
      supabase
        .from("presencas")
        .select("*")
        .eq("acolhido_id", params.id)
        .order("data", { ascending: false })
        .limit(200),
      supabase
        .from("presencas")
        .select("id")
        .eq("acolhido_id", params.id)
        .eq("data", hojeISO()),
    ]);

  if (!aData) notFound();
  const acolhido = aData as Acolhido;
  const presencas = (presData ?? []) as Presenca[];
  const veioHoje = (hojeData ?? []).length > 0;
  const fotoUrl = await assinarFoto(acolhido.foto_path);

  const idade =
    acolhido.idade_aproximada != null
      ? `~${acolhido.idade_aproximada} anos`
      : null;

  async function registrar(formData: FormData) {
    "use server";
    await registrarPresencaForm(params.id, formData);
  }

  return (
    <div>
      <Link
        href="/inicio"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={18} /> Voltar
      </Link>

      {/* Cabeçalho */}
      <div className="card mb-5 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Avatar nome={acolhido.nome} fotoUrl={fotoUrl} size={88} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-bold">
              {acolhido.como_chamar || acolhido.nome}
            </h1>
            {acolhido.como_chamar && (
              <p className="text-muted">{acolhido.nome}</p>
            )}
            <span className="mt-1 inline-block rounded-full bg-brand-soft px-2.5 py-0.5 text-xs font-medium text-brand">
              {labelTipo(acolhido.tipo)}
            </span>
            {acolhido.status === "inativo" && (
              <span className="mt-1 inline-block rounded-full bg-line px-2.5 py-0.5 text-xs font-medium text-muted">
                Cadastro inativo
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <BotaoPresenca
              acolhidoId={acolhido.id}
              veioHoje={veioHoje}
              tamanho="lg"
            />
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-line pt-5 sm:grid-cols-2">
          <Campo rotulo="Documento" valor={acolhido.documento} />
          <Campo
            rotulo="Nascimento"
            valor={
              acolhido.data_nascimento
                ? formatarData(acolhido.data_nascimento)
                : null
            }
          />
          <Campo
            rotulo="Contato de referência"
            valor={acolhido.contato_referencia}
          />
          <Campo rotulo="Passagem policial / artigo" valor={acolhido.artigo} />
          <Campo
            rotulo="Boletim de ocorrência"
            valor={simNao(acolhido.tem_bo)}
          />
          <Campo
            rotulo="Autoriza uso de imagem"
            valor={simNao(acolhido.autoriza_imagem)}
          />
          <Campo
            rotulo="Data do cadastro"
            valor={
              acolhido.data_cadastro
                ? formatarData(acolhido.data_cadastro)
                : null
            }
          />

          {acolhido.tipo === "rua" && (
            <>
              <Campo rotulo="Idade aproximada" valor={idade} />
              <Campo rotulo="Cidade de origem" valor={acolhido.cidade_origem} />
              <Campo
                rotulo="Restrições alimentares"
                valor={acolhido.restricoes_alimentares}
              />
            </>
          )}

          {acolhido.tipo === "familia" && (
            <>
              <Campo rotulo="Bairro" valor={acolhido.bairro} />
              <Campo rotulo="Cidade" valor={acolhido.cidade} />
              <Campo
                rotulo="Casa própria"
                valor={simNao(acolhido.casa_propria)}
              />
              <Campo
                rotulo="Paga aluguel"
                valor={simNao(acolhido.paga_aluguel)}
              />
              <Campo
                rotulo="Valor do aluguel"
                valor={formatarBRL(acolhido.valor_aluguel)}
              />
              <Campo
                rotulo="Quantidade de filhos"
                valor={acolhido.filhos != null ? String(acolhido.filhos) : null}
              />
              <Campo rotulo="Benefício" valor={acolhido.beneficio} />
              <Campo
                rotulo="Responsável legal"
                valor={acolhido.responsavel_legal}
              />
            </>
          )}

          <div className="sm:col-span-2">
            <Campo rotulo="Observações" valor={acolhido.observacoes} />
          </div>

          {acolhido.tipo === "familia" &&
            acolhido.motivos &&
            acolhido.motivos.length > 0 && (
              <div className="sm:col-span-2">
                <dt className="text-sm text-muted">Motivos</dt>
                <dd className="mt-1 flex flex-wrap gap-2">
                  {acolhido.motivos.map((m) => (
                    <span
                      key={m}
                      className="rounded-full bg-brand-soft px-2.5 py-0.5 text-sm font-medium text-brand"
                    >
                      {m}
                    </span>
                  ))}
                </dd>
              </div>
            )}
        </dl>

        <div className="mt-5 flex flex-wrap gap-3 border-t border-line pt-5">
          <Link href={`/acolhidos/${acolhido.id}/editar`} className="btn-ghost">
            <Pencil size={18} /> Editar cadastro
          </Link>
          <BotaoStatus id={acolhido.id} status={acolhido.status} />
        </div>
      </div>

      {/* Registrar presença */}
      <div className="card mb-5 p-5">
        <h2 className="mb-4 text-lg font-bold">Registrar presença</h2>
        <FormPresenca action={registrar} />
      </div>

      {/* Histórico */}
      <div className="card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Histórico de presenças</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand">
            <CalendarDays size={16} /> {presencas.length}{" "}
            {presencas.length === 1 ? "vez" : "vezes"}
          </span>
        </div>

        {presencas.length === 0 ? (
          <p className="text-muted">Nenhuma presença registrada ainda.</p>
        ) : (
          <ul className="divide-y divide-line">
            {presencas.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between py-3"
              >
                <span className="font-medium">{formatarData(p.data)}</span>
                <span className="text-sm text-muted">
                  {labelRefeicao(p.refeicao)}
                  {p.observacao ? ` · ${p.observacao}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
