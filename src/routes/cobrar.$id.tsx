import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { describeOptions, formatCOP } from "@/lib/shaks-store";
import {
  etiquetaCuenta,
  fetchCuenta,
  registrarPago,
  totalItems,
  type MetodoPago,
} from "@/lib/servicio";

export const Route = createFileRoute("/cobrar/$id")({
  head: () => ({ meta: [{ title: "Cobrar — Shaks" }] }),
  component: CobrarPage,
});

const METODOS: { valor: MetodoPago; texto: string }[] = [
  { valor: "efectivo", texto: "💵 Efectivo" },
  { valor: "tarjeta", texto: "💳 Tarjeta" },
  { valor: "transferencia", texto: "📱 Transferencia" },
];

function CobrarPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const cuentaQ = useQuery({
    queryKey: ["cuenta", id],
    queryFn: () => fetchCuenta(id),
    refetchInterval: 5_000,
  });
  const cuenta = cuentaQ.data;

  // itemId → unidades que paga la persona actual
  const [sel, setSel] = useState<Record<string, number>>({});
  const [persona, setPersona] = useState("");
  const [metodo, setMetodo] = useState<MetodoPago>("efectivo");
  const [recibido, setRecibido] = useState("");

  const numPagos = cuenta?.pagos.length ?? 0;
  useEffect(() => {
    setPersona(`Persona ${numPagos + 1}`);
  }, [numPagos]);

  const cobrar = useMutation({
    mutationFn: () => {
      if (!cuenta) throw new Error("Cuenta no cargada.");
      const seleccion = Object.entries(sel)
        .filter(([, q]) => q > 0)
        .map(([itemId, qty]) => ({ itemId, qty }));
      return registrarPago(cuenta, persona.trim() || `Persona ${numPagos + 1}`, metodo, seleccion);
    },
    onSuccess: () => {
      setSel({});
      setRecibido("");
      qc.invalidateQueries({ queryKey: ["cuenta", id] });
      qc.invalidateQueries({ queryKey: ["cuentas-abiertas"] });
    },
  });

  if (cuentaQ.isPending)
    return (
      <main className="mx-auto max-w-5xl px-4 py-6 text-lg text-muted-foreground">Cargando…</main>
    );
  if (cuentaQ.isError || !cuenta) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-6">
        <p className="rounded-2xl bg-destructive px-5 py-4 text-lg font-bold text-destructive-foreground">
          No se encontró esta cuenta.
        </p>
        <Link to="/" className="mt-4 inline-block font-bold text-primary underline">
          ← Volver a mesas
        </Link>
      </main>
    );
  }

  const pendientes = cuenta.items.filter((i) => !i.pago_id);
  const total = totalItems(cuenta.items);
  const pagado = cuenta.pagos.reduce((s, p) => s + p.monto, 0);
  const porPagar = totalItems(pendientes);
  const subtotal = pendientes.reduce((s, i) => s + i.precio * (sel[i.id] ?? 0), 0);
  const recibidoN = Number(recibido.replace(/\D/g, ""));
  const cambio = metodo === "efectivo" && recibidoN > 0 ? recibidoN - subtotal : null;
  const cerrada = cuenta.estado !== "abierta";

  const fijar = (itemId: string, qty: number) => setSel((s) => ({ ...s, [itemId]: qty }));
  const todo = () => setSel(Object.fromEntries(pendientes.map((i) => [i.id, i.qty])));

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Link
        to="/pedido/$id"
        params={{ id }}
        className="text-base font-bold text-primary underline underline-offset-2"
      >
        ← Volver al pedido
      </Link>
      <h1 className="font-display text-3xl text-foreground sm:text-4xl">
        Cobrar · {etiquetaCuenta(cuenta)}
      </h1>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <Cifra titulo="Total" valor={total} />
        <Cifra titulo="Pagado" valor={pagado} tono="text-accent" />
        <Cifra titulo="Por pagar" valor={porPagar} tono="text-primary" />
      </div>

      {cerrada ? (
        <div className="mt-6 rounded-2xl bg-accent px-5 py-5 text-accent-foreground">
          <p className="text-2xl font-extrabold">✅ Cuenta pagada y cerrada</p>
          <p className="mt-1 text-lg">
            {cuenta.tipo === "mesa" ? "La mesa quedó libre." : "El pedido salió de la lista."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              to="/recibo/$id"
              params={{ id }}
              search={{ auto: 1 }}
              className="inline-block rounded-xl bg-card px-5 py-3 text-lg font-bold text-foreground"
            >
              🖨️ Imprimir recibo completo
            </Link>
            <Link
              to="/"
              className="inline-block rounded-xl border-2 border-accent-foreground px-5 py-3 text-lg font-bold"
            >
              Volver a mesas
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <section
            aria-label="Productos por pagar"
            className="rounded-2xl border-4 border-border bg-card p-5"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-2xl text-foreground">
                ¿Qué paga {persona || "esta persona"}?
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={todo}
                  className="rounded-lg bg-secondary px-3 py-2 text-sm font-bold text-secondary-foreground"
                >
                  Todo
                </button>
                <button
                  onClick={() => setSel({})}
                  className="rounded-lg bg-secondary px-3 py-2 text-sm font-bold text-secondary-foreground"
                >
                  Ninguno
                </button>
              </div>
            </div>
            {pendientes.length === 0 ? (
              <p className="text-base text-muted-foreground">No queda nada por pagar.</p>
            ) : (
              <ul className="divide-y divide-border">
                {pendientes.map((i) => {
                  const q = sel[i.id] ?? 0;
                  return (
                    <li
                      key={i.id}
                      className={`flex items-center justify-between gap-3 py-3 ${q > 0 ? "bg-gold/10" : ""}`}
                    >
                      <div className="min-w-0">
                        <p className="text-base font-bold">
                          {i.qty}× {i.nombre}{" "}
                          <span className="font-semibold text-muted-foreground">
                            · {formatCOP(i.precio)} c/u
                          </span>
                        </p>
                        {i.opciones.length > 0 && (
                          <p className="text-sm font-semibold text-primary">
                            {describeOptions(i.opciones)}
                          </p>
                        )}
                        {i.comentario && (
                          <p className="text-sm text-muted-foreground">📝 {i.comentario}</p>
                        )}
                      </div>
                      {i.qty === 1 ? (
                        <button
                          aria-pressed={q === 1}
                          onClick={() => fijar(i.id, q === 1 ? 0 : 1)}
                          className={`h-12 w-12 shrink-0 rounded-xl border-4 text-xl font-extrabold ${
                            q === 1
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground"
                          }`}
                        >
                          {q === 1 ? "✓" : ""}
                        </button>
                      ) : (
                        <div className="flex shrink-0 items-center gap-2">
                          <button
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
            )}
          </section>

          <aside className="flex flex-col gap-4 rounded-2xl border-4 border-primary bg-card p-5">
            <label className="flex flex-col gap-1.5">
              <span className="text-base font-bold">Quién paga</span>
              <input
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                maxLength={40}
                className="h-12 rounded-xl border-2 border-input bg-background px-3 text-base outline-none focus:border-primary"
              />
            </label>
            <div className="flex flex-col gap-1.5">
              <span className="text-base font-bold">Método</span>
              <div className="grid gap-2">
                {METODOS.map((m) => (
                  <button
                    key={m.valor}
                    aria-pressed={metodo === m.valor}
                    onClick={() => setMetodo(m.valor)}
                    className={`min-h-11 rounded-xl text-base font-bold ${metodo === m.valor ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
                  >
                    {m.texto}
                  </button>
                ))}
              </div>
            </div>
            {metodo === "efectivo" && (
              <label className="flex flex-col gap-1.5">
                <span className="text-base font-bold">Recibido (opcional)</span>
                <input
                  inputMode="numeric"
                  value={recibido}
                  onChange={(e) => setRecibido(e.target.value)}
                  placeholder="$"
                  className="h-12 rounded-xl border-2 border-input bg-background px-3 text-base outline-none focus:border-primary"
                />
                {cambio !== null && (
                  <span
                    className={`text-lg font-extrabold ${cambio < 0 ? "text-destructive" : "text-accent"}`}
                  >
                    {cambio < 0 ? `Faltan ${formatCOP(-cambio)}` : `Cambio: ${formatCOP(cambio)}`}
                  </span>
                )}
              </label>
            )}
            <p className="flex items-baseline justify-between text-lg font-bold">
              Subtotal{" "}
              <span className="text-3xl font-extrabold text-primary">{formatCOP(subtotal)}</span>
            </p>
            {cobrar.isError && (
              <p
                role="alert"
                className="rounded-xl bg-destructive px-4 py-3 font-bold text-destructive-foreground"
              >
                {cobrar.error.message}
              </p>
            )}
            <button
              onClick={() => cobrar.mutate()}
              disabled={subtotal === 0 || cobrar.isPending}
              className="min-h-16 rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground shadow-lg transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {cobrar.isPending
                ? "Registrando…"
                : subtotal === porPagar && subtotal > 0
                  ? `Cobrar todo · ${formatCOP(subtotal)}`
                  : `Cobrar ${formatCOP(subtotal)}`}
            </button>
          </aside>
        </div>
      )}

      {cuenta.pagos.length > 0 && (
        <section aria-label="Pagos registrados" className="mt-8">
          <h2 className="mb-3 font-display text-2xl text-foreground">Pagos registrados</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {cuenta.pagos.map((p) => {
              const items = cuenta.items.filter((i) => i.pago_id === p.id);
              return (
                <div key={p.id} className="rounded-2xl border-4 border-accent bg-card p-4">
                  <p className="flex items-baseline justify-between gap-2 text-lg font-extrabold">
                    {p.persona} <span className="text-accent">{formatCOP(p.monto)}</span>
                  </p>
                  <p className="text-sm font-bold uppercase text-muted-foreground">{p.metodo}</p>
                  <ul className="mt-1 text-base">
                    {items.map((i) => (
                      <li key={i.id}>
                        {i.qty}× {i.nombre}
                        {i.opciones.length > 0 && (
                          <span className="text-muted-foreground">
                            {" "}
                            · {describeOptions(i.opciones)}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/recibo/$id"
                    params={{ id }}
                    search={{ pago: p.id, auto: 1 }}
                    className="mt-3 inline-block rounded-lg border-2 border-border bg-card px-3 py-1.5 text-sm font-bold text-foreground"
                  >
                    🖨️ Imprimir recibo de {p.persona}
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}

function Cifra({
  titulo,
  valor,
  tono = "text-foreground",
}: {
  titulo: string;
  valor: number;
  tono?: string;
}) {
  return (
    <div className="rounded-2xl border-4 border-border bg-card px-2 py-3">
      <p className="text-sm font-bold uppercase text-muted-foreground">{titulo}</p>
      <p className={`text-xl font-extrabold sm:text-3xl ${tono}`}>{formatCOP(valor)}</p>
    </div>
  );
}
