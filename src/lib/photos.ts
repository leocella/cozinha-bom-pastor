import { createClient } from "@/lib/supabase/server";

const BUCKET = "fotos";
const EXPIRA_SEG = 60 * 60; // 1 hora

/**
 * Recebe uma lista de caminhos de objeto (foto_path) e devolve um mapa
 * caminho -> URL assinada temporária. Caminhos nulos são ignorados.
 */
export async function assinarFotos(
  paths: (string | null | undefined)[],
): Promise<Record<string, string>> {
  const limpos = Array.from(
    new Set(paths.filter((p): p is string => !!p)),
  );
  if (limpos.length === 0) return {};

  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(limpos, EXPIRA_SEG);

  if (error || !data) return {};

  const mapa: Record<string, string> = {};
  data.forEach((item) => {
    if (item.path && item.signedUrl) mapa[item.path] = item.signedUrl;
  });
  return mapa;
}

export async function assinarFoto(
  path: string | null | undefined,
): Promise<string | null> {
  if (!path) return null;
  const mapa = await assinarFotos([path]);
  return mapa[path] ?? null;
}
