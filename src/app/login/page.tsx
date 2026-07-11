"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UtensilsCrossed, LoaderCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: senha,
    });
    if (error) {
      setErro(error.message || "Erro ao fazer login.");
      setCarregando(false);
      return;
    }
    router.replace("/inicio");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-xl2 bg-brand-soft text-brand">
            <UtensilsCrossed size={28} />
          </div>
          <h1 className="text-2xl font-bold">Cozinha Comunitária</h1>
          <p className="mt-1 text-sm text-muted">
            Entre para acessar o cadastro e as presenças.
          </p>
        </div>

        <form onSubmit={entrar} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="senha">
              Senha
            </label>
            <input
              id="senha"
              type="password"
              autoComplete="current-password"
              required
              className="field"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>

          {erro && (
            <p className="rounded-xl2 bg-danger-soft px-4 py-3 text-sm text-danger">
              {erro}
            </p>
          )}

          <button type="submit" className="btn-brand w-full" disabled={carregando}>
            {carregando ? (
              <>
                <LoaderCircle className="animate-spin" size={20} /> Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
