"use client";

import { useState, useTransition } from "react";
import { Check, Plus, LoaderCircle } from "lucide-react";
import { registrarPresenca } from "@/lib/actions/presencas";

export default function BotaoPresenca({
  acolhidoId,
  veioHoje,
  tamanho = "md",
}: {
  acolhidoId: string;
  veioHoje: boolean;
  tamanho?: "md" | "lg";
}) {
  const [pendente, startTransition] = useTransition();
  const [marcado, setMarcado] = useState(veioHoje);
  const [erro, setErro] = useState<string | null>(null);

  function marcar() {
    if (marcado || pendente) return;
    setErro(null);
    startTransition(async () => {
      const r = await registrarPresenca(acolhidoId);
      if (r.ok) {
        setMarcado(true);
      } else {
        setErro(r.mensagem);
      }
    });
  }

  const grande = tamanho === "lg";
  const base = grande ? "px-6 py-4 text-lg" : "px-4 py-2.5 text-sm";

  if (marcado) {
    return (
      <span
        className={`inline-flex items-center justify-center gap-2 rounded-xl2 bg-brand-soft font-semibold text-brand ${base}`}
      >
        <Check size={grande ? 22 : 18} /> Veio hoje
      </span>
    );
  }

  return (
    <div className="flex flex-col items-stretch">
      <button
        type="button"
        onClick={marcar}
        disabled={pendente}
        className={`inline-flex items-center justify-center gap-2 rounded-xl2 bg-brand font-semibold text-white transition-colors hover:bg-brand-dark disabled:opacity-70 ${base}`}
      >
        {pendente ? (
          <LoaderCircle className="animate-spin" size={grande ? 22 : 18} />
        ) : (
          <Plus size={grande ? 22 : 18} />
        )}
        Presente hoje
      </button>
      {erro && <span className="mt-1 text-xs text-danger">{erro}</span>}
    </div>
  );
}
