"use client";

import { useRef, useState } from "react";
import { CalendarPlus, LoaderCircle } from "lucide-react";
import { REFEICOES, hojeISO } from "@/lib/types";

export default function FormPresenca({
  action,
}: {
  action: (formData: FormData) => Promise<void>;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [salvando, setSalvando] = useState(false);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSalvando(true);
    setOk(false);
    try {
      await action(new FormData(e.currentTarget));
      setOk(true);
      formRef.current?.reset();
      setTimeout(() => setOk(false), 2500);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="data">
            Data
          </label>
          <input
            id="data"
            name="data"
            type="date"
            defaultValue={hojeISO()}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="refeicao">
            Refeição
          </label>
          <select id="refeicao" name="refeicao" className="field" defaultValue="">
            <option value="">Não informar</option>
            {REFEICOES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label" htmlFor="observacao">
          Observação (opcional)
        </label>
        <input id="observacao" name="observacao" className="field" />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-brand" disabled={salvando}>
          {salvando ? (
            <>
              <LoaderCircle className="animate-spin" size={20} /> Registrando…
            </>
          ) : (
            <>
              <CalendarPlus size={20} /> Registrar presença
            </>
          )}
        </button>
        {ok && (
          <span className="text-sm font-medium text-brand">
            Presença registrada.
          </span>
        )}
      </div>
    </form>
  );
}
