import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { assinarFoto } from "@/lib/photos";
import FormAcolhido from "@/components/FormAcolhido";
import { atualizarAcolhido } from "@/lib/actions/acolhidos";
import type { Acolhido } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditarAcolhidoPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data } = await supabase
    .from("acolhidos")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!data) notFound();
  const acolhido = data as Acolhido;
  const fotoUrl = await assinarFoto(acolhido.foto_path);

  async function action(formData: FormData) {
    "use server";
    await atualizarAcolhido(params.id, formData);
  }

  return (
    <div>
      <Link
        href={`/acolhidos/${acolhido.id}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={18} /> Voltar
      </Link>
      <h1 className="mb-5 text-2xl font-bold">Editar cadastro</h1>
      <FormAcolhido acolhido={acolhido} fotoUrl={fotoUrl} action={action} />
    </div>
  );
}
