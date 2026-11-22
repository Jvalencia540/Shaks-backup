import type { OrderItem, OrderItemOption } from "@/lib/shaks-store";

// Una línea del pedido en Caja. Dos líneas del mismo producto con distintas
// opciones o comentario se cuentan por separado (Alitas BBQ ≠ Alitas MM).
export interface CartLine {
  key: string;
  name: string;
  price: number;
  qty: number;
  opciones: OrderItemOption[];
  comentario: string;
}

export function lineKey(name: string, opciones: OrderItemOption[], comentario: string): string {
  return JSON.stringify([name, opciones.map((o) => [o.nombre, o.valor]), comentario.trim()]);
}

// Junta las líneas que quedaron iguales y quita las que llegaron a 0.
function normalize(lines: CartLine[]): CartLine[] {
  const merged = new Map<string, CartLine>();
  for (const l of lines) {
    if (l.qty <= 0) continue;
    const prev = merged.get(l.key);
    merged.set(l.key, prev ? { ...prev, qty: prev.qty + l.qty } : l);
  }
  return [...merged.values()];
}

export function addLine(
  lines: CartLine[],
  item: { name: string; price: number; opciones?: OrderItemOption[]; comentario?: string },
  qty = 1,
): CartLine[] {
  const opciones = item.opciones ?? [];
  const comentario = (item.comentario ?? "").trim();
  const key = lineKey(item.name, opciones, comentario);
  return normalize([...lines, { key, name: item.name, price: item.price, qty, opciones, comentario }]);
}

export function changeLineQty(lines: CartLine[], key: string, delta: number): CartLine[] {
  return normalize(lines.map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l)));
}

export function setLineComment(lines: CartLine[], key: string, comentario: string): CartLine[] {
  return normalize(
    lines.map((l) => {
      if (l.key !== key) return l;
      const c = comentario.trim();
      return { ...l, comentario: c, key: lineKey(l.name, l.opciones, c) };
    }),
  );
}

export function toOrderItems(lines: CartLine[]): OrderItem[] {
  return lines.map((l) => ({
    name: l.name,
    qty: l.qty,
    price: l.price,
    ...(l.opciones.length > 0 ? { opciones: l.opciones } : {}),
    ...(l.comentario ? { comentario: l.comentario } : {}),
  }));
}
