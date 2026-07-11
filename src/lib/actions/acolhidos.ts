"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

function num(v: FormDataEntryValue | null): number | null {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function bool(v: FormDataEntryValue | null): boolean | null {
  const s = (v ?? "").toString().trim();
  if (s === "sim") return true;
  if (s === "nao") return false;
  return null;
}

function numDec(v: FormDataEntryValue | null): number | null {
  const s = (v ?? "").toString().trim().replace(",", ".");
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

function arr(values: FormDataEntryValue[]): string[] | null {
  const list = values.map((v) => v.toString().trim()).filter(Boolean);
  return list.length ? list : null;
}

function tipoDe(v: FormDataEntryValue | null): "rua" | "familia" {
  return v?.toString() === "familia" ? "familia" : "rua";
}

function montarPayload(formData: FormData) {
  return {
    nome: (str(formData.get("nome")) ?? "").toString(),
    tipo: tipoDe(formData.get("tipo")),
    como_chamar: str(formData.get("como_chamar")),
    foto_path: str(formData.get("foto_path")),
    idade_aproximada: num(formData.get("idade_aproximada")),
    data_nascimento: str(formData.get("data_nascimento")),
    documento: str(formData.get("documento")),
    cidade_origem: str(formData.get("cidade_origem")),
    contato_referencia: str(formData.get("contato_referencia")),
    restricoes_alimentares: str(formData.get("restricoes_alimentares")),
    observacoes: str(formData.get("observacoes")),
    // comuns novos
    artigo: str(formData.get("artigo")),
    tem_bo: bool(formData.get("tem_bo")),
    autoriza_imagem: bool(formData.get("autoriza_imagem")),
    data_cadastro: str(formData.get("data_cadastro")),
    // família
    bairro: str(formData.get("bairro")),
    cidade: str(formData.get("cidade")),
    paga_aluguel: bool(formData.get("paga_aluguel")),
    valor_aluguel: numDec(formData.get("valor_aluguel")),
    casa_propria: bool(formData.get("casa_propria")),
    filhos: num(formData.get("filhos")),
    beneficio: str(formData.get("beneficio")),
    responsavel_legal: str(formData.get("responsavel_legal")),
    motivos: arr(formData.getAll("motivos")),
  };
}

export async function criarAcolhido(formData: FormData) {
  const supabase = createClient();
  const payload = montarPayload(formData);

  if (!payload.nome) {
    throw new Error("Informe pelo menos o nome.");
  }

  const { data, error } = await supabase
    .from("acolhidos")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/inicio");
  redirect(`/acolhidos/${data.id}`);
}

export async function atualizarAcolhido(id: string, formData: FormData) {
  const supabase = createClient();
  const payload = montarPayload(formData);

  if (!payload.nome) {
    throw new Error("Informe pelo menos o nome.");
  }

  const { error } = await supabase
    .from("acolhidos")
    .update(payload)
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/inicio");
  revalidatePath(`/acolhidos/${id}`);
  redirect(`/acolhidos/${id}`);
}

export async function excluirAcolhido(id: string) {
  const supabase = createClient();
  // As presenças são removidas em cascata (FK on delete cascade).
  const { error } = await supabase.from("acolhidos").delete().eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/inicio");
  redirect("/inicio");
}

export async function definirStatus(
  id: string,
  status: "ativo" | "inativo",
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("acolhidos")
    .update({ status })
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/inicio");
  revalidatePath(`/acolhidos/${id}`);
}
