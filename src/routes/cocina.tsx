import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { describeOptions } from "@/lib/shaks-store";
import {
  etiquetaCuenta,
  fetchComandas,
  marcarRonda,
  type Comanda,
  type CuentaItem,
} from "@/lib/servicio";

export const Route = createFileRoute("/cocina")({
  head: () => ({
    meta: [
      { title: "Cocina — Shaks" },
      {
        name: "description",
        content: "Pantalla de cocina: rondas por mesa, para llevar y domicilio, con temporizador.",
      },
    ],
  }),
  component: CocinaPage,
});

// Un producto con sus opciones y comentario, para que cocina no los pase por alto.
function ItemLine({ item }: { item: CuentaItem }) {
  return (
    <li>
      <span>
        {item.qty}× {item.nombre}
      </span>
      {item.opciones.length > 0 && (
        <span className="block text-base font-bold text-primary">
          {describeOptions(item.opciones)}
        </span>
      )}
      {item.comentario && (
        <span className="mt-0.5 block rounded-lg bg-gold px-2 py-1 text-base font-bold text-gold-foreground">
          📝 {item.comentario}
        </span>
      )}
    </li>
  );
}

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

const minutes = (since: string, now: number) =>
  Math.max(0, Math.floor((now - Date.parse(since)) / 60000));

function timerClass(min: number) {
  if (min >= 15) return "bg-destructive text-destructive-foreground";
  if (min >= 8) return "bg-gold text-gold-foreground";
  return "bg-accent text-accent-foreground";
}

const ICONO = { mesa: "🍽️", llevar: "🛍️", domicilio: "🛵" } as const;

function Encabezado({ c }: { c: Comanda }) {
  return (
    <div className="min-w-0">
      <span className="block rounded-xl bg-primary px-4 py-2 text-2xl font-extrabold text-primary-foreground">
        {ICONO[c.cuenta.tipo]} {etiquetaCuenta(c.cuenta)}
      </span>
      <span className="mt-1 block text-sm font-bold uppercase text-muted-foreground">
        Ronda {c.ronda}
      </span>
    </div>
  );
}

function CocinaPage() {
  const now = useNow();
  const qc = useQueryClient();
  const comandasQ = useQuery({
    queryKey: ["comandas"],
    queryFn: fetchComandas,
    refetchInterval: 4_000,
  });
  const comandas = comandasQ.data ?? [];

  const marcar = useMutation({
    mutationFn: ({
      c,
      de,
      a,
    }: {
      c: Comanda;
      de: "pendiente" | "listo";
      a: "listo" | "entregado";
    }) => marcarRonda(c.cuenta.id, c.ronda, de, a),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["comandas"] });
      qc.invalidateQueries({ queryKey: ["cuentas-abiertas"] });
    },
  });

  const pending = comandas
    .filter((c) => c.estado === "pendiente")
    .sort((a, b) => a.desde.localeCompare(b.desde));
  const ready = comandas
    .filter((c) => c.estado === "listo")
    .sort((a, b) => a.desde.localeCompare(b.desde));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-display text-3xl text-foreground sm:text-4xl">Pantalla de Cocina</h1>
      <p className="mt-1 text-lg text-muted-foreground">
        {pending.length} en preparación · {ready.length} listos para llevar
      </p>
      {comandasQ.isError && (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-destructive px-5 py-4 text-lg font-bold text-destructive-foreground"
        >
          No se pudieron cargar los pedidos. Reintentando…
        </p>
      )}
      {marcar.isError && (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-destructive px-5 py-4 text-lg font-bold text-destructive-foreground"
        >
          No se pudo actualizar el pedido: {marcar.error.message}
        </p>
      )}

      <section aria-label="Pedidos en preparación" className="mt-6">
        <h2 className="mb-3 font-display text-2xl text-foreground">🔥 En preparación</h2>
        {comandasQ.isPending ? (
          <p className="rounded-2xl bg-secondary p-6 text-xl font-semibold text-muted-foreground">
            Cargando…
          </p>
        ) : pending.length === 0 ? (
          <p className="rounded-2xl bg-secondary p-6 text-xl font-semibold text-muted-foreground">
            No hay pedidos pendientes. ¡Buen trabajo! 🎉
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pending.map((c) => {
              const min = minutes(c.desde, now);
              return (
                <article
                  key={`${c.cuenta.id}-${c.ronda}-p`}
                  className="flex flex-col gap-3 rounded-2xl border-4 border-primary bg-card p-5 shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <Encabezado c={c} />
                    <span
                      className={`shrink-0 rounded-xl px-4 py-2 text-2xl font-extrabold tabular-nums ${timerClass(min)}`}
                    >
                      ⏱ {min} min
                    </span>
                  </div>
                  {c.cuenta.comentario && (
                    <p className="rounded-lg bg-secondary px-3 py-2 text-base font-semibold">
                      📝 {c.cuenta.comentario}
                    </p>
                  )}
                  <ul className="space-y-2 text-lg font-semibold">
                    {c.items.map((i) => (
                      <ItemLine key={i.id} item={i} />
                    ))}
                  </ul>
                  <button
                    onClick={() => marcar.mutate({ c, de: "pendiente", a: "listo" })}
                    disabled={marcar.isPending}
                    className="mt-auto min-h-16 rounded-2xl bg-info text-xl font-extrabold text-info-foreground transition-transform active:scale-95"
                  >
                    ✅ LISTO — AVISAR AL MESERO
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="Pedidos listos" className="mt-8">
        <h2 className="mb-3 font-display text-2xl text-foreground">📢 Listos para llevar</h2>
        {ready.length === 0 ? (
          <p className="rounded-2xl bg-secondary p-6 text-xl font-semibold text-muted-foreground">
            Nada esperando por ahora.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ready.map((c) => (
              <article
                key={`${c.cuenta.id}-${c.ronda}-l`}
                className="flex flex-col gap-3 rounded-2xl border-4 border-gold bg-card p-5 shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <Encabezado c={c} />
                  <span className="shrink-0 animate-pulse text-xl font-extrabold text-gold">
                    🔔 {minutes(c.desde, now)} min
                  </span>
                </div>
                <ul className="space-y-2 text-lg font-semibold">
                  {c.items.map((i) => (
                    <ItemLine key={i.id} item={i} />
                  ))}
                </ul>
                <button
                  onClick={() => marcar.mutate({ c, de: "listo", a: "entregado" })}
                  disabled={marcar.isPending}
                  className="mt-auto min-h-16 rounded-2xl bg-accent text-xl font-extrabold text-accent-foreground transition-transform active:scale-95"
                >
                  🤝 ENTREGADO
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
