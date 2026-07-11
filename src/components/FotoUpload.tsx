"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { iniciais } from "@/lib/types";

export default function FotoUpload({
  nome,
  initialPath,
  initialUrl,
}: {
  nome: string;
  initialPath: string | null;
  initialUrl: string | null;
}) {
  const supabase = createClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [path, setPath] = useState<string | null>(initialPath);
  const [preview, setPreview] = useState<string | null>(initialUrl);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  async function aoSelecionar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!userId) {
      setErro("Sessão não carregada. Recarregue a página.");
      return;
    }
    setErro(null);
    setEnviando(true);

    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const novoPath = `${userId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from("fotos")
      .upload(novoPath, file, { upsert: true, contentType: file.type });

    if (error) {
      setErro("Não foi possível enviar a foto. Tente novamente.");
      setEnviando(false);
      return;
    }

    // remove a foto anterior (se havia)
    if (path && path !== novoPath) {
      await supabase.storage.from("fotos").remove([path]);
    }

    setPath(novoPath);
    setPreview(URL.createObjectURL(file));
    setEnviando(false);
  }

  function remover() {
    if (path) supabase.storage.from("fotos").remove([path]);
    setPath(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="flex items-center gap-4">
      <input type="hidden" name="foto_path" value={path ?? ""} />

      <div className="relative">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Prévia da foto"
            className="h-24 w-24 rounded-xl2 object-cover"
          />
        ) : (
          <span className="flex h-24 w-24 items-center justify-center rounded-xl2 bg-amber-soft font-display text-2xl font-bold text-amber">
            {iniciais(nome || "?")}
          </span>
        )}
        {enviando && (
          <span className="absolute inset-0 flex items-center justify-center rounded-xl2 bg-ink/40 text-white">
            <LoaderCircle className="animate-spin" size={24} />
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={aoSelecionar}
        />
        <button
          type="button"
          className="btn-ghost"
          onClick={() => inputRef.current?.click()}
          disabled={enviando}
        >
          <Camera size={20} /> {preview ? "Trocar foto" : "Tirar / enviar foto"}
        </button>
        {preview && (
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-sm text-danger hover:underline"
            onClick={remover}
          >
            <X size={16} /> Remover foto
          </button>
        )}
        {erro && <span className="text-sm text-danger">{erro}</span>}
      </div>
    </div>
  );
}
