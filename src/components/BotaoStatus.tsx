"use client";

import { useTransition } from "react";
import { LoaderCircle, UserX, UserCheck } from "lucide-react";
import { definirStatus } from "@/lib/actions/acolhidos";

export default function BotaoStatus({
  id,
  status,
}: {
  id: string;
  status: "ativo" | "inativo";
}) {
  const [pendente, startTransition] = useTransition();
  const inativo = status === "inativo";

  function alternar() {
    startTransition(async () => {
      await definirStatus(id, inativo ? "ativo" : "inativo");
    });
  }

  return (
    <button
      type="button"
      onClick={alternar}
      disabled={pendente}
      className={inativo ? "btn-ghost" : "btn-danger"}
    >
      {pendente ? (
        <LoaderCircle className="animate-spin" size={20} />
      ) : inativo ? (
        <UserCheck size={20} />
      ) : (
        <UserX size={20} />
      )}
      {inativo ? "Reativar cadastro" : "Desativar cadastro"}
    </button>
  );
}
