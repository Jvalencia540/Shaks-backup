import { supabase } from "@/lib/supabase";

export interface Producto {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
}

export interface Categoria {
  nombre: string;
  productos: Producto[];
}

// Orden de las páginas del menú (MENU 2026). Una categoría nueva que no esté
// aquí aparece al final, en orden alfabético.
const ORDEN_CATEGORIAS = [
  "Entradas",
  "Alitas",
  "Arepas",
  "Sandwiches",
  "Asados",
  "Para picar",
  "Hamburguesas",
  "Crepes y patacones",
  "Bebidas refrescantes",
  "Café, jugos y malteadas",
  "Bebidas con alcohol",
];

export async function fetchProductos(): Promise<Producto[]> {
  const { data, error } = await supabase
    .from("productos")
    .select("id, nombre, precio, categoria")
    .order("precio", { ascending: true })
    .order("nombre", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((p) => ({ ...p, precio: Number(p.precio) }));
}

export function agruparPorCategoria(productos: Producto[]): Categoria[] {
  const grupos = new Map<string, Producto[]>();
  for (const p of productos) {
    const lista = grupos.get(p.categoria) ?? [];
    lista.push(p);
    grupos.set(p.categoria, lista);
  }
  const rango = (c: string) => {
    const i = ORDEN_CATEGORIAS.indexOf(c);
    return i === -1 ? ORDEN_CATEGORIAS.length : i;
  };
  return [...grupos.entries()]
    .sort(([a], [b]) => rango(a) - rango(b) || a.localeCompare(b, "es"))
    .map(([nombre, productos]) => ({ nombre, productos }));
}
