"use client";

import { useState } from "react";
import Link from "next/link";
import { LoaderCircle, Save, Plus, Trash2 } from "lucide-react";
import FotoUpload from "@/components/FotoUpload";
import { TIPOS, MOTIVOS, hojeISO, type Acolhido, type Tipo, type Filho } from "@/lib/types";

function SimNao({
  name,
  label,
  defaultValue,
}: {
  name: string;
  label: string;
  defaultValue?: boolean | null;
}) {
  const dv = defaultValue == null ? "" : defaultValue ? "sim" : "nao";
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
      </label>
      <select id={name} name={name} className="field" defaultValue={dv}>
        <option value="">—</option>
        <option value="sim">Sim</option>
        <option value="nao">Não</option>
      </select>
    </div>
  );
}

export default function FormAcolhido({
  acolhido,
  fotoUrl,
  action,
  tipoInicial,
}: {
  acolhido?: Acolhido;
  fotoUrl?: string | null;
  action: (formData: FormData) => Promise<void>;
  tipoInicial?: Tipo;
}) {
  const [nome, setNome] = useState(acolhido?.nome ?? "");
  const [tipo, setTipo] = useState<Tipo>(
    acolhido?.tipo ?? tipoInicial ?? "rua",
  );
  const [pagaAluguel, setPagaAluguel] = useState<string>(
    acolhido?.paga_aluguel == null ? "" : acolhido.paga_aluguel ? "sim" : "nao",
  );
  const [filhos, setFilhos] = useState<Filho[]>(() => {
    if (acolhido?.filhos_detalhes && acolhido.filhos_detalhes.length > 0) {
      return acolhido.filhos_detalhes;
    }
    if (acolhido?.filhos && acolhido.filhos > 0) {
      return Array.from({ length: acolhido.filhos }, () => ({
        nome: "",
        idade: null,
      }));
    }
    return [];
  });
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function adicionarFilho() {
    setFilhos((prev) => [...prev, { nome: "", idade: null }]);
  }

  function removerFilho(index: number) {
    setFilhos((prev) => prev.filter((_, i) => i !== index));
  }

  function atualizarFilho(
    index: number,
    campo: "nome" | "idade",
    valor: string,
  ) {
    setFilhos((prev) =>
      prev.map((f, i) => {
        if (i !== index) return f;
        if (campo === "nome") return { ...f, nome: valor };
        const idadeNum = valor.trim() !== "" ? parseInt(valor, 10) : null;
        return { ...f, idade: Number.isFinite(idadeNum) ? idadeNum : null };
      }),
    );
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro(null);
    if (!nome.trim()) {
      setErro("Informe pelo menos o nome.");
      return;
    }
    setSalvando(true);
    try {
      await action(new FormData(e.currentTarget));
      setSalvando(false);
    } catch (err) {
      setErro(
        err instanceof Error ? err.message : "Erro ao salvar. Tente de novo.",
      );
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Tipo de cadastro */}
      <div className="card p-5">
        <p className="label">Tipo de cadastro</p>
        <input type="hidden" name="tipo" value={tipo} />
        <div className="grid grid-cols-2 gap-2">
          {TIPOS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setTipo(t.value)}
              aria-pressed={tipo === t.value}
              className={
                tipo === t.value
                  ? "rounded-xl2 border-2 border-brand bg-brand-soft px-4 py-3 text-sm font-semibold text-brand"
                  : "rounded-xl2 border-2 border-line px-4 py-3 text-sm font-medium text-muted"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Foto */}
      <div className="card p-5">
        <p className="label">Foto</p>
        <FotoUpload
          nome={nome}
          initialPath={acolhido?.foto_path ?? null}
          initialUrl={fotoUrl ?? null}
        />
      </div>

      {/* Campos comuns */}
      <div className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="nome">
            Nome <span className="text-danger">*</span>
          </label>
          <input
            id="nome"
            name="nome"
            required
            className="field"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="como_chamar">
            Como gosta de ser chamado(a) / apelido
          </label>
          <input
            id="como_chamar"
            name="como_chamar"
            className="field"
            defaultValue={acolhido?.como_chamar ?? ""}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label" htmlFor="data_nascimento">
              Data de nascimento
            </label>
            <input
              id="data_nascimento"
              name="data_nascimento"
              type="date"
              className="field"
              defaultValue={acolhido?.data_nascimento ?? ""}
            />
          </div>
          <div>
            <label className="label" htmlFor="data_cadastro">
              Data do cadastro
            </label>
            <input
              id="data_cadastro"
              name="data_cadastro"
              type="date"
              className="field"
              defaultValue={acolhido?.data_cadastro ?? hojeISO()}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="documento">
            Documento (opcional)
          </label>
          <input
            id="documento"
            name="documento"
            className="field"
            placeholder="RG, CPF ou outro"
            defaultValue={acolhido?.documento ?? ""}
          />
        </div>

        <div>
          <label className="label" htmlFor="contato_referencia">
            Contato de referência
          </label>
          <input
            id="contato_referencia"
            name="contato_referencia"
            className="field"
            placeholder="Nome e telefone de um familiar ou pessoa próxima"
            defaultValue={acolhido?.contato_referencia ?? ""}
          />
        </div>

        <div>
          <label className="label" htmlFor="artigo">
            Passagem policial / artigo
          </label>
          <input
            id="artigo"
            name="artigo"
            className="field"
            defaultValue={acolhido?.artigo ?? ""}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <SimNao
            name="tem_bo"
            label="Boletim de ocorrência (B.O.)"
            defaultValue={acolhido?.tem_bo}
          />
          <SimNao
            name="autoriza_imagem"
            label="Autoriza uso de imagem"
            defaultValue={acolhido?.autoriza_imagem}
          />
        </div>

        <div>
          <label className="label" htmlFor="observacoes">
            Observações / encaminhamentos
          </label>
          <textarea
            id="observacoes"
            name="observacoes"
            rows={3}
            className="field"
            placeholder="Anotações gerais, encaminhamentos (CRAS, CAPS...), etc."
            defaultValue={acolhido?.observacoes ?? ""}
          />
        </div>
      </div>

      {/* Campos só de Rua */}
      {tipo === "rua" && (
        <div className="card space-y-4 p-5">
          <p className="text-sm font-semibold text-muted">
            Dados — morador de rua
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="idade_aproximada">
                Idade aproximada
              </label>
              <input
                id="idade_aproximada"
                name="idade_aproximada"
                type="number"
                min={0}
                max={130}
                inputMode="numeric"
                className="field"
                defaultValue={acolhido?.idade_aproximada ?? ""}
              />
            </div>
            <div>
              <label className="label" htmlFor="cidade_origem">
                Cidade de origem
              </label>
              <input
                id="cidade_origem"
                name="cidade_origem"
                className="field"
                defaultValue={acolhido?.cidade_origem ?? ""}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="restricoes_alimentares">
              Restrições alimentares
            </label>
            <input
              id="restricoes_alimentares"
              name="restricoes_alimentares"
              className="field"
              defaultValue={acolhido?.restricoes_alimentares ?? ""}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="beneficio">
                Benefício
              </label>
              <input
                id="beneficio"
                name="beneficio"
                className="field"
                placeholder="Bolsa Família, BPC, etc."
                defaultValue={acolhido?.beneficio ?? ""}
              />
            </div>
            <div>
              <label className="label" htmlFor="valor_beneficio">
                Valor do benefício (R$)
              </label>
              <input
                id="valor_beneficio"
                name="valor_beneficio"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                className="field"
                placeholder="Ex: 600,00"
                defaultValue={acolhido?.valor_beneficio ?? ""}
              />
            </div>
          </div>

          {/* Filhos e Pensão alimentícia */}
          <div className="space-y-3 rounded-xl border border-line p-4">
            <div className="flex items-center justify-between">
              <label className="label mb-0">Filhos (Nome e Idade)</label>
              <button
                type="button"
                onClick={adicionarFilho}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                <Plus size={14} /> Adicionar filho
              </button>
            </div>
            <input
              type="hidden"
              name="filhos_detalhes_json"
              value={JSON.stringify(filhos)}
            />
            {filhos.length === 0 ? (
              <p className="text-xs text-muted">Nenhum filho informado.</p>
            ) : (
              <div className="space-y-2">
                {filhos.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nome do filho"
                      className="field flex-1"
                      value={f.nome}
                      onChange={(e) =>
                        atualizarFilho(i, "nome", e.target.value)
                      }
                    />
                    <input
                      type="number"
                      min={0}
                      max={120}
                      placeholder="Idade"
                      className="field w-24"
                      value={f.idade ?? ""}
                      onChange={(e) =>
                        atualizarFilho(i, "idade", e.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removerFilho(i)}
                      className="p-2 text-muted hover:text-danger"
                      title="Remover filho"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <SimNao
            name="paga_pensao"
            label="Paga pensão alimentícia (filho menor)"
            defaultValue={acolhido?.paga_pensao}
          />
        </div>
      )}

      {/* Campos só de Família / Idoso */}
      {tipo === "familia" && (
        <div className="card space-y-4 p-5">
          <p className="text-sm font-semibold text-muted">
            Dados — família / idoso
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <label className="label" htmlFor="rua">
                Rua
              </label>
              <input
                id="rua"
                name="rua"
                className="field"
                placeholder="Nome da rua"
                defaultValue={acolhido?.rua ?? ""}
              />
            </div>
            <div>
              <label className="label" htmlFor="numero">
                Número
              </label>
              <input
                id="numero"
                name="numero"
                className="field"
                placeholder="Nº"
                defaultValue={acolhido?.numero ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label" htmlFor="bairro">
                Bairro
              </label>
              <input
                id="bairro"
                name="bairro"
                className="field"
                defaultValue={acolhido?.bairro ?? ""}
              />
            </div>
            <div>
              <label className="label" htmlFor="cidade">
                Cidade
              </label>
              <input
                id="cidade"
                name="cidade"
                className="field"
                defaultValue={acolhido?.cidade ?? ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <SimNao
              name="casa_propria"
              label="Casa própria"
              defaultValue={acolhido?.casa_propria}
            />
            <div>
              <label className="label" htmlFor="paga_aluguel">
                Paga aluguel
              </label>
              <select
                id="paga_aluguel"
                name="paga_aluguel"
                className="field"
                value={pagaAluguel}
                onChange={(e) => setPagaAluguel(e.target.value)}
              >
                <option value="">—</option>
                <option value="sim">Sim</option>
                <option value="nao">Não</option>
              </select>
            </div>
          </div>

          {pagaAluguel === "sim" && (
            <div>
              <label className="label" htmlFor="valor_aluguel">
                Valor do aluguel (R$)
              </label>
              <input
                id="valor_aluguel"
                name="valor_aluguel"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                className="field"
                defaultValue={acolhido?.valor_aluguel ?? ""}
              />
            </div>
          )}

          {/* Filhos (Nome e Idade) */}
          <div className="space-y-3 rounded-xl border border-line p-4">
            <div className="flex items-center justify-between">
              <label className="label mb-0">Filhos (Nome e Idade)</label>
              <button
                type="button"
                onClick={adicionarFilho}
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
              >
                <Plus size={14} /> Adicionar filho
              </button>
            </div>
            <input
              type="hidden"
              name="filhos_detalhes_json"
              value={JSON.stringify(filhos)}
            />
            {filhos.length === 0 ? (
              <p className="text-xs text-muted">Nenhum filho informado.</p>
            ) : (
              <div className="space-y-2">
                {filhos.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nome do filho"
                      className="field flex-1"
                      value={f.nome}
                      onChange={(e) =>
                        atualizarFilho(i, "nome", e.target.value)
                      }
                    />
                    <input
                      type="number"
                      min={0}
                      max={120}
                      placeholder="Idade"
                      className="field w-24"
                      value={f.idade ?? ""}
                      onChange={(e) =>
                        atualizarFilho(i, "idade", e.target.value)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removerFilho(i)}
                      className="p-2 text-muted hover:text-danger"
                      title="Remover filho"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label" htmlFor="renda_familiar">
                Renda familiar (R$)
              </label>
              <input
                id="renda_familiar"
                name="renda_familiar"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                className="field"
                placeholder="Ex: 1500,00"
                defaultValue={acolhido?.renda_familiar ?? ""}
              />
            </div>
            <div>
              <label className="label" htmlFor="beneficio">
                Benefício
              </label>
              <input
                id="beneficio"
                name="beneficio"
                className="field"
                placeholder="Bolsa Família, BPC..."
                defaultValue={acolhido?.beneficio ?? ""}
              />
            </div>
            <div>
              <label className="label" htmlFor="valor_beneficio">
                Valor do benefício (R$)
              </label>
              <input
                id="valor_beneficio"
                name="valor_beneficio"
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                className="field"
                placeholder="Ex: 600,00"
                defaultValue={acolhido?.valor_beneficio ?? ""}
              />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="responsavel_legal">
              Responsável legal
            </label>
            <input
              id="responsavel_legal"
              name="responsavel_legal"
              className="field"
              defaultValue={acolhido?.responsavel_legal ?? ""}
            />
          </div>

          <div>
            <p className="label">Motivos</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MOTIVOS.map((m) => (
                <label
                  key={m}
                  className="flex items-center gap-2 rounded-xl2 border border-line px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="motivos"
                    value={m}
                    defaultChecked={acolhido?.motivos?.includes(m) ?? false}
                    className="h-4 w-4"
                  />
                  {m}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {erro && (
        <p className="rounded-xl2 bg-danger-soft px-4 py-3 text-sm text-danger">
          {erro}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" className="btn-brand" disabled={salvando}>
          {salvando ? (
            <>
              <LoaderCircle className="animate-spin" size={20} /> Salvando…
            </>
          ) : (
            <>
              <Save size={20} /> Salvar
            </>
          )}
        </button>
        <Link
          href={acolhido ? `/acolhidos/${acolhido.id}` : "/inicio"}
          className="btn-ghost"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
