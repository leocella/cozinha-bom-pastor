import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import FormAcolhido from "@/components/FormAcolhido";
import { criarAcolhido } from "@/lib/actions/acolhidos";

export default function NovoAcolhidoPage({
  searchParams,
}: {
  searchParams: { tipo?: string };
}) {
  const tipoInicial = searchParams.tipo === "familia" ? "familia" : "rua";

  async function action(formData: FormData) {
    "use server";
    await criarAcolhido(formData);
  }

  return (
    <div>
      <Link
        href="/inicio"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-ink"
      >
        <ArrowLeft size={18} /> Voltar
      </Link>
      <h1 className="mb-5 text-2xl font-bold">Novo cadastro</h1>
      <FormAcolhido action={action} tipoInicial={tipoInicial} />
    </div>
  );
}
