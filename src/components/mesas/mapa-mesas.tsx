import { useRef, useState, type PointerEvent } from "react";
import type { Cuenta, Mesa } from "@/lib/servicio";

export const COLS = 10;
export const ROWS = 8;
const CELL = 84; // px por celda de la cuadrícula
const SIZE = 64; // px de cada mesa

export type EstadoMesa = "libre" | "ocupada" | "lista";

// "lista" = tiene productos listos en cocina esperando a ser llevados.
export function estadoMesa(cuenta: Cuenta | undefined): EstadoMesa {
  if (!cuenta) return "libre";
  return cuenta.items.some((i) => i.estado === "listo") ? "lista" : "ocupada";
}

const COLORES: Record<EstadoMesa, string> = {
  libre: "border-accent bg-card text-accent",
  ocupada: "border-primary bg-primary text-primary-foreground",
  lista: "border-gold bg-gold text-gold-foreground animate-pulse",
};

interface Props {
  mesas: Mesa[];
  cuentaPorMesa: Map<string, Cuenta>;
  seleccionada: string | null;
  onSeleccionar: (id: string) => void;
  editando: boolean;
  onMover: (mesa: Mesa, x: number, y: number) => void;
}

interface Arrastre {
  id: string;
  dx: number; // desplazamiento del puntero dentro de la mesa
  dy: number;
  left: number;
  top: number;
  inicioX: number;
  inicioY: number;
  movio: boolean;
}

export function MapaMesas({
  mesas,
  cuentaPorMesa,
  seleccionada,
  onSeleccionar,
  editando,
  onMover,
}: Props) {
  const lienzo = useRef<HTMLDivElement>(null);
  const [arrastre, setArrastre] = useState<Arrastre | null>(null);

  const posicion = (m: Mesa) => ({
    left: m.x * CELL + (CELL - SIZE) / 2,
    top: m.y * CELL + (CELL - SIZE) / 2,
  });

  const down = (e: PointerEvent<HTMLButtonElement>, m: Mesa) => {
    if (!editando) return;
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = posicion(m);
    setArrastre({
      id: m.id,
      dx: e.clientX - rect.left,
      dy: e.clientY - rect.top,
      ...p,
      inicioX: e.clientX,
      inicioY: e.clientY,
      movio: false,
    });
  };

  const move = (e: PointerEvent<HTMLButtonElement>) => {
    if (!arrastre || !lienzo.current) return;
    const base = lienzo.current.getBoundingClientRect();
    const movio =
      arrastre.movio ||
      Math.abs(e.clientX - arrastre.inicioX) + Math.abs(e.clientY - arrastre.inicioY) > 6;
    setArrastre({
      ...arrastre,
      movio,
      left: Math.min(Math.max(0, e.clientX - base.left - arrastre.dx), COLS * CELL - SIZE),
      top: Math.min(Math.max(0, e.clientY - base.top - arrastre.dy), ROWS * CELL - SIZE),
    });
  };

  const up = (m: Mesa) => {
    if (!arrastre) return;
    const a = arrastre;
    setArrastre(null);
    if (!a.movio) {
      onSeleccionar(m.id);
      return;
    }
    const x = Math.min(COLS - 1, Math.max(0, Math.round((a.left - (CELL - SIZE) / 2) / CELL)));
    const y = Math.min(ROWS - 1, Math.max(0, Math.round((a.top - (CELL - SIZE) / 2) / CELL)));
    const ocupada = mesas.some((o) => o.id !== m.id && o.x === x && o.y === y);
    if (!ocupada && (x !== m.x || y !== m.y)) onMover(m, x, y);
    onSeleccionar(m.id);
  };

  return (
    <div className="overflow-auto rounded-2xl border-4 border-border bg-card">
      <div
        ref={lienzo}
        className="relative"
        style={{
          width: COLS * CELL,
          height: ROWS * CELL,
          backgroundImage: editando
            ? "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)"
            : undefined,
          backgroundSize: `${CELL}px ${CELL}px`,
        }}
      >
        {mesas.map((m) => {
          const estado = estadoMesa(cuentaPorMesa.get(m.id));
          const enArrastre = arrastre?.id === m.id ? arrastre : null;
          const pos = enArrastre ? { left: enArrastre.left, top: enArrastre.top } : posicion(m);
          const activa = seleccionada === m.id;
          return (
            <button
              key={m.id}
              type="button"
              aria-label={`Mesa ${m.numero}, ${estado === "libre" ? "libre" : estado === "lista" ? "con pedido listo" : "ocupada"}`}
              aria-pressed={activa}
              onClick={() => !editando && onSeleccionar(m.id)}
              onPointerDown={(e) => down(e, m)}
              onPointerMove={move}
              onPointerUp={() => up(m)}
              onPointerCancel={() => setArrastre(null)}
              style={{
                ...pos,
                width: SIZE,
                height: SIZE,
                touchAction: editando ? "none" : undefined,
              }}
              className={`absolute grid place-items-center border-4 font-display text-2xl shadow-md transition-[box-shadow] ${
                m.forma === "redonda" ? "rounded-full" : "rounded-xl"
              } ${COLORES[estado]} ${activa ? "ring-4 ring-gold ring-offset-2 ring-offset-card" : ""} ${
                editando
                  ? enArrastre
                    ? "z-10 cursor-grabbing shadow-xl"
                    : "cursor-grab"
                  : "active:scale-95"
              }`}
            >
              {m.numero}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function LeyendaMesas() {
  const item = (clase: string, texto: string) => (
    <span className="flex items-center gap-2">
      <span className={`h-5 w-5 rounded-md border-4 ${clase}`} />
      {texto}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-4 text-base font-semibold text-muted-foreground">
      {item("border-accent bg-card", "Libre")}
      {item("border-primary bg-primary", "Ocupada")}
      {item("border-gold bg-gold", "Pedido listo para llevar")}
    </div>
  );
}

// Primera celda libre, de arriba a abajo y de izquierda a derecha.
export function celdaLibre(mesas: Mesa[]): { x: number; y: number } | null {
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!mesas.some((m) => m.x === x && m.y === y)) return { x, y };
    }
  }
  return null;
}
