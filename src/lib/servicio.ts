// Mesas, cuentas (mesa / para llevar / domicilio), rondas de cocina y pagos.
// Todo vive en Supabase para que meseros, cocina y admin vean lo mismo.
import { supabase } from "@/lib/supabase";
import type { OrderItem, OrderItemOption } from "@/lib/shaks-store";

export type FormaMesa = "cuadrada" | "redonda";
export type TipoCuenta = "mesa" | "llevar" | "domicilio";
export type EstadoItem = "pendiente" | "listo" | "entregado";
export type MetodoPago = "efectivo" | "tarjeta" | "transferencia";

export interface Mesa {
  id: string;
  numero: number;
  forma: FormaMesa;
  x: number;
  y: number;
}

export interface CuentaItem {
  id: string;
  cuenta_id: string;
  ronda: number;
  nombre: string;
  precio: number;
  qty: number;
  opciones: OrderItemOption[];
  comentario: string | null;
  estado: EstadoItem;
  pago_id: string | null;
  created_at: string;
  listo_at: string | null;
}

export interface Pago {
  id: string;
  cuenta_id: string;
  persona: string;
  monto: number;
  metodo: MetodoPago;
  created_at: string;
}

export interface Cuenta {
  id: string;
  tipo: TipoCuenta;
  mesa_id: string | null;
  personas: number | null;
  cliente: string | null;
  telefono: string | null;
  direccion: string | null;
  comentario: string | null;
  mesero: string | null;
  estado: "abierta" | "cerrada" | "anulada";
  created_at: string;
  cerrada_at: string | null;
  mesa: { numero: number } | null;
  items: CuentaItem[];
  pagos: Pago[];
}

const CUENTA_SELECT = "*, mesa:mesas(numero), items:cuenta_items(*), pagos(*)";

// Lanza el error de Supabase; si no hay error, los datos existen.
function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

function normCuenta(c: Cuenta): Cuenta {
  return {
    ...c,
    items: (c.items ?? [])
      .map((i) => ({
        ...i,
        precio: Number(i.precio),
        opciones: Array.isArray(i.opciones) ? i.opciones : [],
      }))
      .sort((a, b) => a.ronda - b.ronda || a.created_at.localeCompare(b.created_at)),
    pagos: (c.pagos ?? [])
      .map((p) => ({ ...p, monto: Number(p.monto) }))
      .sort((a, b) => a.created_at.localeCompare(b.created_at)),
  };
}

// Nombre corto para mostrar: "Mesa 7", "Para llevar · Ana", "Domicilio · Calle 5".
export function etiquetaCuenta(c: Pick<Cuenta, "tipo" | "mesa" | "cliente" | "direccion">): string {
  if (c.tipo === "mesa") return `Mesa ${c.mesa?.numero ?? "?"}`;
  if (c.tipo === "llevar") return c.cliente ? `Para llevar · ${c.cliente}` : "Para llevar";
  return c.cliente ? `Domicilio · ${c.cliente}` : "Domicilio";
}

export const totalItems = (items: Pick<CuentaItem, "precio" | "qty">[]) =>
  items.reduce((s, i) => s + i.precio * i.qty, 0);

// ---------- Mesas ----------

export async function fetchMesas(): Promise<Mesa[]> {
  return check(await supabase.from("mesas").select("id, numero, forma, x, y").order("numero"));
}

export async function crearMesa(m: Omit<Mesa, "id">): Promise<void> {
  check(await supabase.from("mesas").insert(m));
}

export async function actualizarMesa(
  id: string,
  cambios: Partial<Omit<Mesa, "id">>,
): Promise<void> {
  check(await supabase.from("mesas").update(cambios).eq("id", id));
}

export async function eliminarMesa(id: string): Promise<void> {
  const { error } = await supabase.from("mesas").delete().eq("id", id);
  if (error) {
    // La mesa ya tiene cuentas guardadas (historial): no se puede borrar.
    if (error.code === "23503")
      throw new Error("Esta mesa tiene cuentas registradas y no se puede borrar.");
    throw new Error(error.message);
  }
}

// ---------- Cuentas ----------

export async function fetchCuentasAbiertas(): Promise<Cuenta[]> {
  const data = check(
    await supabase
      .from("cuentas")
      .select(CUENTA_SELECT)
      .eq("estado", "abierta")
      .order("created_at"),
  ) as Cuenta[];
  return data.map(normCuenta);
}

export async function fetchCuenta(id: string): Promise<Cuenta> {
  const data = check(
    await supabase.from("cuentas").select(CUENTA_SELECT).eq("id", id).single(),
  ) as Cuenta;
  return normCuenta(data);
}

export interface NuevaCuenta {
  tipo: TipoCuenta;
  mesa_id?: string | null;
  personas?: number | null;
  cliente?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  comentario?: string | null;
  mesero?: string | null;
}

export async function abrirCuenta(c: NuevaCuenta): Promise<string> {
  const { data, error } = await supabase
    .from("cuentas")
    .insert({ ...c, mesa_id: c.tipo === "mesa" ? c.mesa_id : null })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("Esa mesa ya tiene una cuenta abierta.");
    throw new Error(error.message);
  }
  return data.id;
}

export async function actualizarCuenta(id: string, cambios: Partial<NuevaCuenta>): Promise<void> {
  check(await supabase.from("cuentas").update(cambios).eq("id", id));
}

// Solo para cuentas abiertas por error (sin productos enviados).
export async function anularCuenta(id: string): Promise<void> {
  check(
    await supabase
      .from("cuentas")
      .update({ estado: "anulada", cerrada_at: new Date().toISOString() })
      .eq("id", id),
  );
}

async function cerrarCuenta(id: string): Promise<void> {
  check(
    await supabase
      .from("cuentas")
      .update({ estado: "cerrada", cerrada_at: new Date().toISOString() })
      .eq("id", id),
  );
}

// Envía a cocina una nueva ronda de productos.
export async function enviarRonda(cuentaId: string, items: OrderItem[]): Promise<void> {
  if (items.length === 0) return;
  const prev = check(
    await supabase
      .from("cuenta_items")
      .select("ronda")
      .eq("cuenta_id", cuentaId)
      .order("ronda", { ascending: false })
      .limit(1),
  );
  const ronda = (prev[0]?.ronda ?? 0) + 1;
  check(
    await supabase.from("cuenta_items").insert(
      items.map((i) => ({
        cuenta_id: cuentaId,
        ronda,
        nombre: i.name,
        precio: i.price,
        qty: i.qty,
        opciones: i.opciones ?? [],
        comentario: i.comentario ?? null,
      })),
    ),
  );
}

// ---------- Cocina ----------

export interface Comanda {
  cuenta: Pick<Cuenta, "id" | "tipo" | "mesa" | "cliente" | "direccion" | "comentario">;
  ronda: number;
  estado: "pendiente" | "listo";
  desde: string; // cuándo se envió (o cuándo quedó lista)
  items: CuentaItem[];
}

// Rondas que cocina tiene por preparar o por entregar.
export async function fetchComandas(): Promise<Comanda[]> {
  const data = check(
    await supabase
      .from("cuenta_items")
      .select("*, cuenta:cuentas(id, tipo, cliente, direccion, comentario, mesa:mesas(numero))")
      .in("estado", ["pendiente", "listo"])
      .order("created_at"),
  ) as (CuentaItem & { cuenta: Comanda["cuenta"] })[];

  const grupos = new Map<string, Comanda>();
  for (const row of data) {
    const { cuenta, ...item } = row;
    const estado = item.estado === "listo" ? "listo" : "pendiente";
    const key = `${item.cuenta_id}:${item.ronda}:${estado}`;
    const it = {
      ...item,
      precio: Number(item.precio),
      opciones: Array.isArray(item.opciones) ? item.opciones : [],
    };
    const g = grupos.get(key);
    if (g) g.items.push(it);
    else
      grupos.set(key, {
        cuenta,
        ronda: item.ronda,
        estado,
        desde: estado === "listo" ? (item.listo_at ?? item.created_at) : item.created_at,
        items: [it],
      });
  }
  return [...grupos.values()];
}

export async function marcarRonda(
  cuentaId: string,
  ronda: number,
  de: EstadoItem,
  a: EstadoItem,
): Promise<void> {
  const ahora = new Date().toISOString();
  const cambios =
    a === "listo" ? { estado: a, listo_at: ahora } : { estado: a, entregado_at: ahora };
  check(
    await supabase
      .from("cuenta_items")
      .update(cambios)
      .eq("cuenta_id", cuentaId)
      .eq("ronda", ronda)
      .eq("estado", de),
  );
}

// ---------- Pagos ----------

export interface SeleccionPago {
  itemId: string;
  qty: number; // unidades de ese producto que paga esta persona
}

// Registra lo que paga una persona. Si paga solo parte de una línea (1 de 3
// cervezas), la línea se divide para que cada unidad quede con su pago.
// Cuando ya no queda nada por pagar, la cuenta se cierra y la mesa se libera.
export async function registrarPago(
  cuenta: Cuenta,
  persona: string,
  metodo: MetodoPago,
  seleccion: SeleccionPago[],
): Promise<{ cerrada: boolean }> {
  const porId = new Map(cuenta.items.map((i) => [i.id, i]));
  const validas = seleccion.filter((s) => {
    const it = porId.get(s.itemId);
    return it && !it.pago_id && s.qty > 0 && s.qty <= it.qty;
  });
  if (validas.length === 0) throw new Error("Seleccione al menos un producto.");

  const monto = validas.reduce((s, v) => s + porId.get(v.itemId)!.precio * v.qty, 0);
  const pago = check(
    await supabase
      .from("pagos")
      .insert({ cuenta_id: cuenta.id, persona, metodo, monto })
      .select("id")
      .single(),
  ) as { id: string };

  for (const v of validas) {
    const it = porId.get(v.itemId)!;
    if (v.qty === it.qty) {
      check(await supabase.from("cuenta_items").update({ pago_id: pago.id }).eq("id", it.id));
    } else {
      check(
        await supabase
          .from("cuenta_items")
          .update({ qty: it.qty - v.qty })
          .eq("id", it.id),
      );
      check(
        await supabase.from("cuenta_items").insert({
          cuenta_id: it.cuenta_id,
          ronda: it.ronda,
          nombre: it.nombre,
          precio: it.precio,
          qty: v.qty,
          opciones: it.opciones,
          comentario: it.comentario,
          estado: it.estado,
          pago_id: pago.id,
          created_at: it.created_at,
          listo_at: it.listo_at,
        }),
      );
    }
  }

  const pendientes = check(
    await supabase
      .from("cuenta_items")
      .select("id")
      .eq("cuenta_id", cuenta.id)
      .is("pago_id", null)
      .limit(1),
  );
  if (pendientes.length === 0) {
    await cerrarCuenta(cuenta.id);
    return { cerrada: true };
  }
  return { cerrada: false };
}

// ---------- Métricas ----------

// Cuentas creadas desde el inicio del día (cerradas o abiertas, no anuladas).
export async function fetchCuentasDelDia(): Promise<Cuenta[]> {
  const inicio = new Date();
  inicio.setHours(0, 0, 0, 0);
  const data = check(
    await supabase
      .from("cuentas")
      .select(CUENTA_SELECT)
      .neq("estado", "anulada")
      .gte("created_at", inicio.toISOString())
      .order("created_at"),
  ) as Cuenta[];
  return data.map(normCuenta);
}
