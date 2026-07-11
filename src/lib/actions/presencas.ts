"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { hojeISO, type Refeicao } from "@/lib/types";

type ResultadoPresenca = { ok: boolean; mensagem: string };

/**
 * Registra presença de um acolhido. Por padrão, na data de hoje.
 * O índice único (acolhido_id, data) impede duplicar no mesmo dia — nesse
 * caso devolvemos uma mensagem amigável em vez de erro.
 */
export async function registrarPresenca(
  acolhidoId: string,
  opts?: { data?: string; refeicao?: Refeicao | null; observacao?: string | null },
): Promise<ResultadoPresenca> {
  const supabase = createClient();
  const data = opts?.data ?? hojeISO();

  const { error } = await supabase.from("presencas").insert({
    acolhido_id: acolhidoId,
    data,
    refeicao: opts?.refeicao ?? null,
    observacao: opts?.observacao ?? null,
  });

  if (error) {
    // 23505 = violação de índice único (já tem presença nesse dia)
    if (error.code === "23505") {
      return { ok: true, mensagem: "Presença já registrada hoje." };
    }
    return { ok: false, mensagem: error.message };
  }

  revalidatePath("/inicio");
  revalidatePath("/hoje");
  revalidatePath(`/acolhidos/${acolhidoId}`);
  return { ok: true, mensagem: "Presença registrada." };
}

export async function registrarPresencaForm(
  acolhidoId: string,
  formData: FormData,
): Promise<void> {
  const data = (formData.get("data")?.toString() || hojeISO()).trim();
  const refeicaoRaw = formData.get("refeicao")?.toString() || "";
  const refeicao = (
    ["cafe", "almoco", "janta", "outro"].includes(refeicaoRaw)
      ? refeicaoRaw
      : null
  ) as Refeicao | null;
  const observacao = formData.get("observacao")?.toString().trim() || null;

  await registrarPresenca(acolhidoId, { data, refeicao, observacao });
}

export async function removerPresenca(id: string, acolhidoId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("presencas").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/inicio");
  revalidatePath("/hoje");
  revalidatePath(`/acolhidos/${acolhidoId}`);
}
