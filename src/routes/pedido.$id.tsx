import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addLine, toOrderItems, type CartLine } from "@/lib/cart";
import type { Producto } from "@/lib/productos";
import { describeOptions, formatCOP } from "@/lib/shaks-store";
import {
  enviarRonda,
  etiquetaCuenta,
  fetchCuenta,
  marcarRonda,
  totalItems,
  type CuentaItem,
} from "@/lib/servicio";
import { MenuProductos } from "@/components/pedido/menu-productos";
import { Carrito } from "@/components/pedido/carrito";
import { ProductoOpcionesDialog } from "@/components/producto-opciones-dialog";

export const Route = createFileRoute("/pedido/$id")({
  head: () => ({ meta: [{ title: "Pedido — Shaks" }] }),
  component: PedidoPage,
});

const ESTADO: Record<CuentaItem["estado"], { texto: string; clase: string }> = {
  pendiente: { texto: "🔥 En cocina", clase: "bg-info text-info-foreground" },
  listo: { texto: "🔔 Listo", clase: "bg-gold text-gold-foreground" },
  entregado: { texto: "✓ Entregado", clase: "bg-secondary text-muted-foreground" },
};

function PedidoPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [conOpciones, setConOpciones] = useState<Producto | null>(null);
  const [enviado, setEnviado] = useState(false);

  const cuentaQ = useQuery({
    queryKey: ["cuenta", id],
    queryFn: () => fetchCuenta(id),
    refetchInterval: 5_000,
  });
  const cuenta = cuentaQ.data;

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["cuenta", id] });
    qc.invalidateQueries({ queryKey: ["cuentas-abiertas"] });
    qc.invalidateQueries({ queryKey: ["comandas"] });
  };

  const enviar = useMutation({
    mutationFn: () => enviarRonda(id, toOrderItems(cart)),
    onSuccess: () => {
      setCart([]);
      setEnviado(true);
      refrescar();
    },
  });
  const entregar = useMutation({
    mutationFn: (ronda: number) => marcarRonda(id, ronda, "listo", "entregado"),
    onSuccess: refrescar,
  });

  const cambiar = (fn: (l: CartLine[]) => CartLine[]) => {
    setEnviado(false);
    setCart(fn);
  };
  const qtyDe = (nombre: string) => cart.reduce((s, l) => s + (l.name === nombre ? l.qty : 0), 0);
  const tocar = (p: Producto) => {
    if (p.opciones.length > 0) setConOpciones(p);
    else cambiar((ls) => addLine(ls, { name: p.nombre, price: p.precio }));
  };

  if (cuentaQ.isPending)
    return (
      <main className="mx-auto max-w-6xl px-4 py-6 text-lg text-muted-foreground">Cargando…</main>
    );
  if (cuentaQ.isError || !cuenta) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <p className="rounded-2xl bg-destructive px-5 py-4 text-lg font-bold text-destructive-foreground">
          No se encontró esta cuenta.
        </p>
        <Link to="/" className="mt-4 inline-block font-bold text-primary underline">
          ← Volver a mesas
        </Link>
      </main>
    );
  }

  const abierta = cuenta.estado === "abierta";
  const rondas = [...new Set(cuenta.items.map((i) => i.ronda))];
  const totalRonda = totalItems(toOrderItems(cart).map((i) => ({ precio: i.price, qty: i.qty })));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/" className="text-base font-bold text-primary underline underline-offset-2">
            ← Mesas
          </Link>
          <h1 className="font-display text-3xl text-foreground sm:text-4xl">
            {etiquetaCuenta(cuenta)}
          </h1>
          <p className="text-base text-muted-foreground">
            {[
              cuenta.personas ? `${cuenta.personas} personas` : null,
              cuenta.mesero ? `Mesero: ${cuenta.mesero}` : null,
              cuenta.direccion,
              cuenta.telefono,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {cuenta.items.length > 0 && abierta && (
          <Link
            to="/cobrar/$id"
            params={{ id }}
            className="rounded-xl border-2 border-border bg-card px-5 py-3 text-lg font-bold text-foreground"
          >
            💵 Cobrar
          </Link>
        )}
      </div>

      {!abierta && (
        <p className="mt-4 rounded-2xl bg-secondary px-5 py-4 text-lg font-bold text-muted-foreground">
          Esta cuenta está {cuenta.estado}. Ya no se pueden agregar productos.
        </p>
      )}
      {enviado && (
        <div className="mt-4 rounded-2xl bg-accent px-5 py-4 text-xl font-bold text-accent-foreground">
          ✅ ¡Ronda enviada a cocina!
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
        <section aria-label="Menú" className="min-w-0">
          {abierta ? <MenuProductos qtyDe={qtyDe} onTocar={tocar} /> : null}
        </section>

        <div className="flex flex-col gap-4">
          {abierta && (
            <aside className="flex flex-col gap-4 rounded-2xl border-4 border-primary bg-card p-5">
              <h2 className="font-display text-2xl text-foreground">Nueva ronda</h2>
              <div className="min-h-16 rounded-xl bg-secondary p-3">
                <Carrito lineas={cart} onCambiar={cambiar} />
              </div>
              <p className="text-right text-2xl font-extrabold text-primary">
                {formatCOP(totalRonda)}
              </p>
              {enviar.isError && (
                <p
                  role="alert"
                  className="rounded-xl bg-destructive px-4 py-3 font-bold text-destructive-foreground"
                >
                  No se pudo enviar: {enviar.error.message}
                </p>
              )}
              <button
                onClick={() => enviar.mutate()}
                disabled={cart.length === 0 || enviar.isPending}
                className="min-h-16 rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground shadow-lg transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {enviar.isPending ? "Enviando…" : "🚀 ENVIAR A COCINA"}
              </button>
            </aside>
          )}

          <aside className="flex flex-col gap-3 rounded-2xl border-4 border-border bg-card p-5">
            <h2 className="font-display text-2xl text-foreground">Ya pedido</h2>
            {rondas.length === 0 ? (
              <p className="text-base text-muted-foreground">
                Todavía no se ha enviado nada a cocina.
              </p>
            ) : (
              rondas.map((r) => {
                const items = cuenta.items.filter((i) => i.ronda === r);
                const hayListos = items.some((i) => i.estado === "listo");
                return (
                  <div key={r} className="rounded-xl bg-secondary p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-extrabold uppercase text-muted-foreground">
                        Ronda {r}
                      </span>
                      {hayListos && (
                        <button
                          onClick={() => entregar.mutate(r)}
                          disabled={entregar.isPending}
                          className="rounded-lg bg-gold px-3 py-1 text-sm font-extrabold text-gold-foreground"
                        >
                          ✓ Llevado a la mesa
                        </button>
                      )}
                    </div>
                    <ul className="space-y-1.5">
                      {items.map((i) => (
                        <li key={i.id} className="text-base">
                          <div className="flex items-start justify-between gap-2 font-semibold">
                            <span>
                              {i.qty}× {i.nombre}
                            </span>
                            <span className="shrink-0">{formatCOP(i.precio * i.qty)}</span>
                          </div>
                          {i.opciones.length > 0 && (
                            <p className="text-sm font-semibold text-primary">
                              {describeOptions(i.opciones)}
                            </p>
                          )}
                          {i.comentario && (
                            <p className="text-sm font-semibold text-muted-foreground">
                              📝 {i.comentario}
                            </p>
                          )}
                          <div className="mt-0.5 flex gap-1.5">
                            <span
                              className={`rounded-md px-2 py-0.5 text-xs font-bold ${ESTADO[i.estado].clase}`}
                            >
                              {ESTADO[i.estado].texto}
                            </span>
                            {i.pago_id && (
                              <span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
                                💵 Pagado
                              </span>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })
            )}
            <p className="flex items-baseline justify-between border-t-2 border-border pt-3 text-lg font-bold">
              Total cuenta{" "}
              <span className="text-2xl font-extrabold text-primary">
                {formatCOP(totalItems(cuenta.items))}
              </span>
            </p>
          </aside>
        </div>
      </div>

      <ProductoOpcionesDialog
        producto={conOpciones}
        onClose={() => setConOpciones(null)}
        onAdd={({ opciones, comentario, qty }) => {
          const p = conOpciones;
          if (p)
            cambiar((ls) =>
              addLine(ls, { name: p.nombre, price: p.precio, opciones, comentario }, qty),
            );
          setConOpciones(null);
        }}
      />
    </main>
  );
}
