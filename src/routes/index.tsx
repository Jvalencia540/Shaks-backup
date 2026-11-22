import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addOrder, describeOptions, formatCOP, getOrders } from "@/lib/shaks-store";
import { supabase } from "@/lib/supabase";
import { agruparPorCategoria, fetchProductos, type Producto } from "@/lib/productos";
import { addLine, changeLineQty, setLineComment, toOrderItems, type CartLine } from "@/lib/cart";
import { ProductoOpcionesDialog } from "@/components/producto-opciones-dialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Caja — Shaks" },
      { name: "description", content: "Toma de pedidos en caja: elige ítems del menú, asigna beeper y envía a cocina." },
      { property: "og:title", content: "Caja — Shaks" },
      { property: "og:description", content: "Toma pedidos rápido y envíalos a cocina con un toque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CajaPage,
});

function CajaPage() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [beeper, setBeeper] = useState<number | null>(null);
  const [sent, setSent] = useState(false);
  const [categoriaActiva, setCategoriaActiva] = useState<string | null>(null);
  const [conOpciones, setConOpciones] = useState<Producto | null>(null);
  const [editandoNota, setEditandoNota] = useState<string | null>(null);

  const productosQuery = useQuery({ queryKey: ["productos"], queryFn: fetchProductos, staleTime: 5 * 60_000 });
  const productos = productosQuery.data ?? [];
  const categorias = useMemo(() => agruparPorCategoria(productos), [productos]);
  const categoria = categorias.find((c) => c.nombre === categoriaActiva) ?? categorias[0];
  const occupiedBeepers = useMemo(
    () => new Set(getOrders().filter((o) => o.status !== "delivered").map((o) => o.beeper)),
    [sent]
  );

  const items = toOrderItems(cart);
  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const qtyDe = (nombre: string) => cart.reduce((s, l) => s + (l.name === nombre ? l.qty : 0), 0);

  const update = (fn: (lines: CartLine[]) => CartLine[]) => {
    setSent(false);
    setCart(fn);
  };

  // Un producto con opciones abre el diálogo; uno sin opciones se suma directo.
  const tocarProducto = (p: Producto) => {
    if (p.opciones.length > 0) setConOpciones(p);
    else update((lines) => addLine(lines, { name: p.nombre, price: p.precio }));
  };

  const send = async () => {
    if (!beeper || items.length === 0) return;

    // Cocina lee los pedidos del store local; Supabase guarda el histórico.
    addOrder(beeper, items);
    const { error } = await supabase.from("pedidos").insert([
      {
        beeper,
        items,
        total,
        estado: "pending",
        created_at: new Date().toISOString(),
      },
    ]);
    if (error) console.error("No se pudo guardar el pedido en Supabase:", error.message);

    setCart([]);
    setEditandoNota(null);
    setBeeper(null);
    setSent(true);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-display text-3xl text-foreground sm:text-4xl">Toma de Pedidos</h1>
      <p className="mt-1 text-lg text-muted-foreground">Toque los ítems para armar el pedido, asigne beeper y envíe a cocina.</p>

      {sent && (
        <div className="mt-4 rounded-2xl bg-accent px-5 py-4 text-xl font-bold text-accent-foreground">
          ✅ ¡Pedido enviado a cocina! Entregue el beeper al cliente.
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Menú */}
        <section aria-label="Menú" className="min-w-0">
          {productosQuery.isPending ? (
            <p className="rounded-2xl bg-secondary px-5 py-6 text-lg text-muted-foreground">Cargando el menú…</p>
          ) : productosQuery.isError ? (
            <div className="rounded-2xl bg-destructive px-5 py-4 text-destructive-foreground">
              <p className="text-lg font-bold">No se pudo cargar el menú.</p>
              <button
                onClick={() => productosQuery.refetch()}
                className="mt-3 rounded-xl bg-card px-4 py-2 text-base font-bold text-foreground"
              >
                Intentar de nuevo
              </button>
            </div>
          ) : categorias.length === 0 ? (
            <p className="rounded-2xl bg-secondary px-5 py-6 text-lg text-muted-foreground">El menú está vacío.</p>
          ) : (
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
                        active ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
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

              <div role="tabpanel" aria-label={categoria?.nombre} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {categoria?.productos.map((p) => {
                  const qty = qtyDe(p.nombre);
                  return (
                    <button
                      key={p.id}
                      onClick={() => tocarProducto(p)}
                      className={`relative min-h-28 rounded-2xl border-4 p-4 text-left shadow-sm transition-transform active:scale-95 ${
                        qty > 0 ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"
                      }`}
                    >
                      <span className={`block text-lg font-bold leading-tight sm:text-xl ${qty > 0 ? "pr-9" : ""}`}>{p.nombre}</span>
                      <span className={`mt-1 block text-base font-semibold ${qty > 0 ? "text-primary-foreground/90" : "text-muted-foreground"}`}>
                        {formatCOP(p.precio)}
                      </span>
                      {p.opciones.length > 0 && (
                        <span className={`mt-1 block text-sm font-bold ${qty > 0 ? "text-primary-foreground/90" : "text-primary"}`}>
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
          )}
        </section>

        {/* Resumen + beeper + enviar */}
        <aside className="flex flex-col gap-4 rounded-2xl border-4 border-border bg-card p-5">
          <h2 className="font-display text-2xl text-foreground">Pedido actual</h2>

          <div className="min-h-16 rounded-xl bg-secondary p-3">
            {cart.length === 0 ? (
              <p className="text-base text-muted-foreground">Sin ítems todavía…</p>
            ) : (
              <ul className="divide-y divide-border">
                {cart.map((l) => (
                  <li key={l.key} className="py-2 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-2 text-base font-semibold">
                      <span className="min-w-0">
                        {l.qty}× {l.name}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {formatCOP(l.price * l.qty)}
                        <button
                          aria-label={`Quitar uno de ${l.name}`}
                          onClick={() => update((lines) => changeLineQty(lines, l.key, -1))}
                          className="grid h-8 w-8 place-items-center rounded-lg bg-destructive text-lg font-bold text-destructive-foreground active:scale-95"
                        >
                          −
                        </button>
                        <button
                          aria-label={`Agregar otro de ${l.name}`}
                          onClick={() => update((lines) => changeLineQty(lines, l.key, 1))}
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
                          update((lines) => setLineComment(lines, l.key, texto));
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
            )}
          </div>

          <p className="text-right text-3xl font-extrabold text-primary">{formatCOP(total)}</p>

          <div>
            <p className="mb-2 text-lg font-bold">Número de beeper</p>
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
                const busy = occupiedBeepers.has(n);
                const active = beeper === n;
                return (
                  <button
                    key={n}
                    disabled={busy}
                    onClick={() => {
                      setBeeper(n);
                      setSent(false);
                    }}
                    className={`grid h-12 place-items-center rounded-xl text-lg font-extrabold transition-transform active:scale-95 ${
                      active
                        ? "bg-primary text-primary-foreground ring-4 ring-gold"
                        : busy
                          ? "cursor-not-allowed bg-muted text-muted-foreground opacity-40"
                          : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={send}
            disabled={!beeper || items.length === 0}
            className="mt-1 min-h-20 rounded-2xl bg-primary text-2xl font-extrabold text-primary-foreground shadow-lg transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
          >
            🚀 ENVIAR A COCINA
          </button>
        </aside>
      </div>

      <ProductoOpcionesDialog
        producto={conOpciones}
        onClose={() => setConOpciones(null)}
        onAdd={({ opciones, comentario, qty }) => {
          const p = conOpciones;
          if (p) update((lines) => addLine(lines, { name: p.nombre, price: p.precio, opciones, comentario }, qty));
          setConOpciones(null);
        }}
      />
    </main>
  );
}

function NotaEditor({
  inicial,
  onGuardar,
  onCancelar,
}: {
  inicial: string;
  onGuardar: (texto: string) => void;
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
        <button type="submit" className="rounded-lg bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground">
          Guardar
        </button>
        <button type="button" onClick={onCancelar} className="rounded-lg bg-card px-3 py-1.5 text-sm font-bold text-foreground">
          Cancelar
        </button>
      </div>
    </form>
  );
}
