import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Producto } from "@/lib/productos";
import { formatCOP, type OrderItemOption } from "@/lib/shaks-store";

interface Props {
  producto: Producto | null;
  onClose: () => void;
  onAdd: (item: { opciones: OrderItemOption[]; comentario: string; qty: number }) => void;
}

// Se abre al tocar un producto que tiene opciones (salsa, shot, sabor...).
// Todas las opciones son obligatorias; el comentario es opcional.
export function ProductoOpcionesDialog({ producto, onClose, onAdd }: Props) {
  const [elegidas, setElegidas] = useState<Record<string, string>>({});
  const [comentario, setComentario] = useState("");
  const [qty, setQty] = useState(1);

  useEffect(() => {
    setElegidas({});
    setComentario("");
    setQty(1);
  }, [producto?.id]);

  if (!producto) return null;

  const faltantes = producto.opciones.filter((o) => !elegidas[o.nombre]);
  const listo = faltantes.length === 0;

  const agregar = () => {
    if (!listo) return;
    onAdd({
      opciones: producto.opciones.map((o) => ({ nombre: o.nombre, valor: elegidas[o.nombre] ?? "" })),
      comentario,
      qty,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-4 border-border bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-8 font-display text-2xl text-foreground">{producto.nombre}</DialogTitle>
          <DialogDescription className="text-lg font-semibold text-muted-foreground">
            {formatCOP(producto.precio)} c/u · elija las opciones
          </DialogDescription>
        </DialogHeader>

        {producto.opciones.map((o) => (
          <fieldset key={o.nombre}>
            <legend className="mb-2 text-lg font-bold text-foreground">{o.nombre}</legend>
            <div className="flex flex-wrap gap-2">
              {o.valores.map((v) => {
                const activo = elegidas[o.nombre] === v;
                return (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setElegidas((prev) => ({ ...prev, [o.nombre]: v }))}
                    className={`min-h-12 rounded-xl px-4 text-base font-bold transition-transform active:scale-95 ${
                      activo ? "bg-primary text-primary-foreground ring-4 ring-gold" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {v}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        <label className="flex flex-col gap-1.5">
          <span className="text-lg font-bold text-foreground">Comentario (opcional)</span>
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={2}
            maxLength={200}
            placeholder="Ej.: salsa aparte, sin hielo…"
            className="rounded-xl border-2 border-input bg-background px-4 py-3 text-base outline-none focus:border-primary"
          />
        </label>

        <div className="flex items-center justify-between gap-3">
          <span className="text-lg font-bold text-foreground">Cantidad</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Menos"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-2xl font-extrabold text-secondary-foreground active:scale-95"
            >
              −
            </button>
            <span className="w-8 text-center text-2xl font-extrabold tabular-nums">{qty}</span>
            <button
              type="button"
              aria-label="Más"
              onClick={() => setQty((q) => q + 1)}
              className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-2xl font-extrabold text-secondary-foreground active:scale-95"
            >
              +
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={agregar}
          disabled={!listo}
          className="min-h-16 rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground shadow-lg transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {listo ? `AGREGAR · ${formatCOP(producto.precio * qty)}` : `Elija ${faltantes.map((f) => f.nombre.toLowerCase()).join(" y ")}`}
        </button>
      </DialogContent>
    </Dialog>
  );
}
