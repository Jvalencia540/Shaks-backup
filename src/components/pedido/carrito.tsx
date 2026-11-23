import { useState } from "react";
import { changeLineQty, setLineComment, type CartLine } from "@/lib/cart";
import { describeOptions, formatCOP } from "@/lib/shaks-store";

// Lista editable de lo que se está por enviar a cocina: cantidades y comentario por línea.
export function Carrito({
  lineas,
  onCambiar,
}: {
  lineas: CartLine[];
  onCambiar: (fn: (l: CartLine[]) => CartLine[]) => void;
}) {
  const [editandoNota, setEditandoNota] = useState<string | null>(null);

  if (lineas.length === 0)
    return (
      <p className="text-base text-muted-foreground">Toque productos del menú para agregarlos…</p>
    );

  return (
    <ul className="divide-y divide-border">
      {lineas.map((l) => (
        <li key={l.key} className="py-2 first:pt-0 last:pb-0">
          <div className="flex items-start justify-between gap-2 text-base font-semibold">
            <span className="min-w-0">
              {l.qty}× {l.name}
            </span>
            <span className="flex shrink-0 items-center gap-1.5">
              {formatCOP(l.price * l.qty)}
              <button
                aria-label={`Quitar uno de ${l.name}`}
                onClick={() => onCambiar((ls) => changeLineQty(ls, l.key, -1))}
                className="grid h-8 w-8 place-items-center rounded-lg bg-destructive text-lg font-bold text-destructive-foreground active:scale-95"
              >
                −
              </button>
              <button
                aria-label={`Agregar otro de ${l.name}`}
                onClick={() => onCambiar((ls) => changeLineQty(ls, l.key, 1))}
                className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-lg font-bold text-primary-foreground active:scale-95"
              >
                +
              </button>
            </span>
          </div>
          {l.opciones.length > 0 && (
            <p className="text-sm font-semibold text-primary">{describeOptions(l.opciones)}</p>
          )}
          {editandoNota === l.key ? (
            <NotaEditor
              inicial={l.comentario}
              onGuardar={(texto) => {
                onCambiar((ls) => setLineComment(ls, l.key, texto));
                setEditandoNota(null);
              }}
              onCancelar={() => setEditandoNota(null)}
            />
          ) : (
            <button
              onClick={() => setEditandoNota(l.key)}
              className="mt-1 block text-left text-sm font-semibold text-muted-foreground underline decoration-dotted underline-offset-2"
            >
              {l.comentario ? `📝 ${l.comentario}` : "+ Agregar comentario"}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function NotaEditor({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial: string;
  onGuardar: (t: string) => void;
  onCancelar: () => void;
}) {
  const [texto, setTexto] = useState(inicial);
  return (
    <form
      className="mt-1.5 flex flex-col gap-1.5"
      onSubmit={(e) => {
        e.preventDefault();
        onGuardar(texto);
      }}
    >
      <input
        autoFocus
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={200}
        placeholder="Ej.: sin cebolla, bien asada…"
        className="h-10 rounded-lg border-2 border-input bg-background px-3 text-base outline-none focus:border-primary"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={onCancelar}
          className="rounded-lg bg-card px-3 py-1.5 text-sm font-bold text-foreground"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
