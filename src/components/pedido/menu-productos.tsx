import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { agruparPorCategoria, fetchProductos, type Producto } from "@/lib/productos";
import { formatCOP } from "@/lib/shaks-store";

// Menú por categorías. qtyDe dice cuántas unidades de cada producto hay en el
// pedido que se está armando, para marcar las tarjetas.
export function MenuProductos({
  qtyDe,
  onTocar,
}: {
  qtyDe: (nombre: string) => number;
  onTocar: (p: Producto) => void;
}) {
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const productosQuery = useQuery({
    queryKey: ["productos"],
    queryFn: fetchProductos,
    staleTime: 5 * 60_000,
  });
  const productos = useMemo(() => productosQuery.data ?? [], [productosQuery.data]);
  const categorias = useMemo(() => agruparPorCategoria(productos), [productos]);
  const categoria = categorias.find((c) => c.nombre === categoriaActiva) ?? categorias[0];

  if (productosQuery.isPending) {
    return (
      <p className="rounded-2xl bg-secondary px-5 py-6 text-lg text-muted-foreground">
        Cargando el menú…
      </p>
    );
  }
  if (productosQuery.isError) {
    return (
      <div className="rounded-2xl bg-destructive px-5 py-4 text-destructive-foreground">
        <p className="text-lg font-bold">No se pudo cargar el menú.</p>
        <button
          onClick={() => productosQuery.refetch()}
          className="mt-3 rounded-xl bg-card px-4 py-2 text-base font-bold text-foreground"
        >
          Intentar de nuevo
        </button>
      </div>
    );
  }
  if (categorias.length === 0) {
    return (
      <p className="rounded-2xl bg-secondary px-5 py-6 text-lg text-muted-foreground">
        El menú está vacío.
      </p>
    );
  }

  return (
    <>
      <div role="tablist" aria-label="Categorías del menú" className="flex flex-wrap gap-2">
        {categorias.map((c) => {
          const active = c.nombre === categoria?.nombre;
          const enPedido = c.productos.reduce((s, p) => s + qtyDe(p.nombre), 0);
          return (
            <button
              key={c.nombre}
              role="tab"
              aria-selected={active}
              onClick={() => setCategoriaActiva(c.nombre)}
              className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-base font-bold transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {c.nombre}
              {enPedido > 0 && (
                <span className="grid h-6 min-w-6 place-items-center rounded-full bg-gold px-1.5 text-sm font-extrabold text-gold-foreground">
                  {enPedido}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        aria-label={categoria?.nombre}
        className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"
      >
        {categoria?.productos.map((p) => {
          const qty = qtyDe(p.nombre);
          return (
            <button
              key={p.id}
              onClick={() => onTocar(p)}
              className={`relative min-h-28 rounded-2xl border-4 p-4 text-left shadow-sm transition-transform active:scale-95 ${
                qty > 0
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card"
              }`}
            >
              <span
                className={`block text-lg font-bold leading-tight sm:text-xl ${qty > 0 ? "pr-9" : ""}`}
              >
                {p.nombre}
              </span>
              <span
                className={`mt-1 block text-base font-semibold ${qty > 0 ? "text-primary-foreground/90" : "text-muted-foreground"}`}
              >
                {formatCOP(p.precio)}
              </span>
              {p.opciones.length > 0 && (
                <span
                  className={`mt-1 block text-sm font-bold ${qty > 0 ? "text-primary-foreground/90" : "text-primary"}`}
                >
                  Elegir {p.opciones.map((o) => o.nombre.toLowerCase()).join(" y ")}
                </span>
              )}
              {qty > 0 && (
                <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-gold text-lg font-extrabold text-gold-foreground">
                  {qty}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </>
  );
}
