"use client";

import { useTransition } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { excluirAcolhido } from "@/lib/actions/acolhidos";

export default function BotaoExcluir({
  id,
  nome,
}: {
  id: string;
  nome: string;
}) {
  const [pendente, startTransition] = useTransition();

  function confirmarEExcluir() {
    const ok = window.confirm(
      `Apagar definitivamente o cadastro de "${nome}"?\n\n` +
        "Isso remove também todo o histórico de presenças desta pessoa. " +
        "Esta ação não pode ser desfeita.",
    );
    if (!ok) return;
    startTransition(async () => {
      await excluirAcolhido(id);
    });
  }

  return (
    <button
      type="button"
      onClick={confirmarEExcluir}
      disabled={pendente}
      className="btn-danger"
    >
      {pendente ? (
        <LoaderCircle className="animate-spin" size={20} />
      ) : (
        <Trash2 size={20} />
      )}
      Apagar cadastro
    </button>
  );
}
