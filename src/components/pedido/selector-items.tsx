import { describeOptions, formatCOP } from "@/lib/shaks-store";
import type { CuentaItem } from "@/lib/servicio";

export type Seleccion = Record<string, number>; // itemId → unidades elegidas

// Lista de productos no pagados donde se eligen unidades (1 de 3 cervezas, etc.).
export function SelectorItems({
  items,
  sel,
  onChange,
}: {
  items: CuentaItem[];
  sel: Seleccion;
  onChange: (s: Seleccion) => void;
}) {
  const fijar = (id: string, q: number) => onChange({ ...sel, [id]: q });

  if (items.length === 0) {
    return <p className="text-base text-muted-foreground">No hay productos sin pagar.</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((i) => {
        const q = sel[i.id] ?? 0;
        return (
          <li
            key={i.id}
            className={`flex items-center justify-between gap-3 py-2.5 ${q > 0 ? "bg-gold/10" : ""}`}
          >
            <div className="min-w-0">
              <p className="text-base font-bold">
                {i.qty}× {i.nombre}{" "}
                <span className="font-semibold text-muted-foreground">
                  · {formatCOP(i.precio)} c/u
                </span>
              </p>
              {i.opciones.length > 0 && (
                <p className="text-sm font-semibold text-primary">{describeOptions(i.opciones)}</p>
              )}
              {i.comentario && <p className="text-sm text-muted-foreground">📝 {i.comentario}</p>}
            </div>
            {i.qty === 1 ? (
              <button
                type="button"
                aria-pressed={q === 1}
                aria-label={`Elegir ${i.nombre}`}
                onClick={() => fijar(i.id, q === 1 ? 0 : 1)}
                className={`h-11 w-11 shrink-0 rounded-xl border-4 text-xl font-extrabold ${
                  q === 1
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground"
                }`}
              >
                {q === 1 ? "✓" : ""}
              </button>
            ) : (
              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Menos"
                  onClick={() => fijar(i.id, Math.max(0, q - 1))}
                  className="h-10 w-10 rounded-lg bg-secondary text-xl font-extrabold"
                >
                  −
                </button>
                <span className="w-12 text-center text-lg font-extrabold tabular-nums">
                  {q}/{i.qty}
                </span>
                <button
                  type="button"
                  aria-label="Más"
                  onClick={() => fijar(i.id, Math.min(i.qty, q + 1))}
                  className="h-10 w-10 rounded-lg bg-secondary text-xl font-extrabold"
                >
                  +
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export const aLista = (sel: Seleccion) =>
  Object.entries(sel)
    .filter(([, q]) => q > 0)
    .map(([itemId, qty]) => ({ itemId, qty }));

export const unidades = (sel: Seleccion) => Object.values(sel).reduce((s, q) => s + q, 0);
