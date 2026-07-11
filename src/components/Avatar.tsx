import { iniciais } from "@/lib/types";

export default function Avatar({
  nome,
  fotoUrl,
  size = 56,
}: {
  nome: string;
  fotoUrl: string | null;
  size?: number;
}) {
  if (fotoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={fotoUrl}
        alt={`Foto de ${nome}`}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-xl2 object-cover"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size, fontSize: size * 0.34 }}
      className="flex shrink-0 items-center justify-center rounded-xl2 bg-amber-soft font-display font-bold text-amber"
      aria-hidden
    >
      {iniciais(nome)}
    </span>
  );
}
