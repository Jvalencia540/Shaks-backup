import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { formatCOP, getOrders, markReady, markDelivered, type Order } from "@/lib/shaks-store";

export const Route = createFileRoute("/cocina")({
  head: () => ({
    meta: [
      { title: "Cocina — Shaks" },
      { name: "description", content: "Pantalla de cocina (KDS): pedidos pendientes con temporizador y notificación al cliente." },
      { property: "og:title", content: "Cocina — Shaks" },
      { property: "og:description", content: "Pedidos pendientes con temporizador y aviso al cliente." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CocinaPage,
});

function useOrders(): Order[] {
  const [orders, setOrders] = useState<Order[]>([]);
  useEffect(() => {
    const refresh = () => setOrders(getOrders());
    refresh();
    window.addEventListener("shaks-update", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("shaks-update", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);
  return orders;
}

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

function minutes(since: number, now: number) {
  return Math.floor((now - since) / 60000);
}

function timerClass(min: number) {
  if (min >= 15) return "bg-destructive text-destructive-foreground";
  if (min >= 8) return "bg-gold text-gold-foreground";
  return "bg-accent text-accent-foreground";
}

function CocinaPage() {
  const orders = useOrders();
  const now = useNow();

  const pending = orders.filter((o) => o.status === "pending").sort((a, b) => a.createdAt - b.createdAt);
  const ready = orders.filter((o) => o.status === "ready").sort((a, b) => (a.readyAt ?? 0) - (b.readyAt ?? 0));

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-display text-3xl text-foreground sm:text-4xl">Pantalla de Cocina</h1>
      <p className="mt-1 text-lg text-muted-foreground">
        {pending.length} en preparación · {ready.length} listos para entregar
      </p>

      <section aria-label="Pedidos en preparación" className="mt-6">
        <h2 className="mb-3 font-display text-2xl text-foreground">🔥 En preparación</h2>
        {pending.length === 0 ? (
          <p className="rounded-2xl bg-secondary p-6 text-xl font-semibold text-muted-foreground">
            No hay pedidos pendientes. ¡Buen trabajo! 🎉
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pending.map((o) => {
              const min = minutes(o.createdAt, now);
              return (
                <article key={o.id} className="flex flex-col gap-3 rounded-2xl border-4 border-primary bg-card p-5 shadow-md">
                  <div className="flex items-center justify-between gap-3">
                    <span className="rounded-xl bg-primary px-4 py-2 text-2xl font-extrabold text-primary-foreground">
                      Beeper #{o.beeper}
                    </span>
                    <span className={`rounded-xl px-4 py-2 text-2xl font-extrabold tabular-nums ${timerClass(min)}`}>
                      ⏱ {min} min
                    </span>
                  </div>
                  <ul className="space-y-1 text-lg font-semibold">
                    {o.items.map((i) => (
                      <li key={i.name}>
                        {i.qty}× {i.name}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xl font-extrabold text-primary">{formatCOP(o.total)}</p>
                  <button
                    onClick={() => markReady(o.id)}
                    className="min-h-16 rounded-2xl bg-info text-xl font-extrabold text-info-foreground transition-transform active:scale-95"
                  >
                    ✅ LISTO — NOTIFICAR CLIENTE
                  </button>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="Pedidos listos" className="mt-10">
        <h2 className="mb-3 font-display text-2xl text-foreground">📢 Listos — llamando al cliente</h2>
        {ready.length === 0 ? (
          <p className="rounded-2xl bg-secondary p-6 text-xl font-semibold text-muted-foreground">Ningún pedido esperando entrega.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {ready.map((o) => (
              <article key={o.id} className="flex flex-col gap-3 rounded-2xl border-4 border-accent bg-card p-5 shadow-md">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-xl bg-accent px-4 py-2 text-2xl font-extrabold text-accent-foreground">
                    Beeper #{o.beeper}
                  </span>
                  <span className="animate-pulse text-xl font-extrabold text-accent">🔔 ¡SUENA!</span>
                </div>
                <ul className="space-y-1 text-lg font-semibold">
                  {o.items.map((i) => (
                    <li key={i.name}>
                      {i.qty}× {i.name}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => markDelivered(o.id)}
                  className="min-h-16 rounded-2xl bg-primary text-xl font-extrabold text-primary-foreground transition-transform active:scale-95"
                >
                  🤝 ENTREGADO (recibí el beeper)
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
