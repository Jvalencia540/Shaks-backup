import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCOP, getOrders, type Order } from "@/lib/shaks-store";

export const Route = createFileRoute("/metricas")({
  head: () => ({
    meta: [
      { title: "Métricas de Hoy — Shaks" },
      { name: "description", content: "Resumen del día: total de ventas en pesos y pedidos entregados." },
      { property: "og:title", content: "Métricas de Hoy — Shaks" },
      { property: "og:description", content: "Ventas del día y pedidos entregados de un vistazo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MetricasPage,
});

type Period = "today" | "month";

const TODAY_SALES = [
  { label: "8 a. m.", sales: 86000 },
  { label: "9 a. m.", sales: 124000 },
  { label: "10 a. m.", sales: 97000 },
  { label: "11 a. m.", sales: 168000 },
  { label: "12 p. m.", sales: 286000 },
  { label: "1 p. m.", sales: 318000 },
  { label: "2 p. m.", sales: 214000 },
  { label: "3 p. m.", sales: 146000 },
  { label: "4 p. m.", sales: 182000 },
  { label: "5 p. m.", sales: 245000 },
  { label: "6 p. m.", sales: 337000 },
  { label: "7 p. m.", sales: 292000 },
];

const MONTH_SALES = [
  { label: "1 sep", sales: 684000 },
  { label: "2 sep", sales: 1421000 },
  { label: "3 sep", sales: 2105000 },
  { label: "4 sep", sales: 2912000 },
  { label: "5 sep", sales: 3848000 },
  { label: "6 sep", sales: 4656000 },
  { label: "7 sep", sales: 5214000 },
  { label: "8 sep", sales: 5968000 },
  { label: "9 sep", sales: 6689000 },
  { label: "10 sep", sales: 7483000 },
  { label: "11 sep", sales: 8271000 },
  { label: "12 sep", sales: 9228000 },
  { label: "13 sep", sales: 10104000 },
  { label: "14 sep", sales: 10742000 },
  { label: "15 sep", sales: 11586000 },
  { label: "16 sep", sales: 12473000 },
];

const chartConfig = {
  sales: {
    label: "Ventas",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

const compactCOP = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  notation: "compact",
  maximumFractionDigits: 1,
});

function MetricasPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [period, setPeriod] = useState<Period>("today");
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

  const delivered = orders.filter((o) => o.status === "delivered");
  const ventasDia = orders.reduce((s, o) => s + o.total, 0);
  const ventasEntregadas = delivered.reduce((s, o) => s + o.total, 0);
  const activos = orders.filter((o) => o.status !== "delivered").length;
  const chartData = period === "today" ? TODAY_SALES : MONTH_SALES;
  const chartTotal =
    period === "today"
      ? TODAY_SALES.reduce((sum, point) => sum + point.sales, 0)
      : MONTH_SALES[MONTH_SALES.length - 1]?.sales ?? 0;
  const peak =
    period === "today"
      ? TODAY_SALES.reduce(
          (best, point) => (point.sales > best.sales ? point : best),
          { label: "", sales: 0 },
        )
      : undefined;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="font-display text-3xl text-foreground sm:text-4xl">Panel de Administración</h1>
      <p className="mt-1 text-lg text-muted-foreground">
        {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
      </p>

      <section aria-labelledby="sales-chart-title" className="mt-6 border-y-4 border-primary bg-card py-6 shadow-sm">
        <div className="flex flex-col gap-4 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-extrabold uppercase text-primary">Panel de ventas</p>
            <h2 id="sales-chart-title" className="mt-1 font-display text-2xl text-foreground sm:text-3xl">
              {period === "today" ? "Ventas por hora" : "Ventas acumuladas del mes"}
            </h2>
            <p className="mt-1 text-base text-muted-foreground">
              {period === "today" ? "Movimiento de caja durante la jornada" : "Crecimiento diario durante septiembre"}
            </p>
          </div>

          <div aria-label="Periodo de la gráfica" className="grid grid-cols-2 rounded-lg border-2 border-primary bg-secondary p-1">
            <Button
              type="button"
              variant={period === "today" ? "default" : "ghost"}
              aria-pressed={period === "today"}
              onClick={() => setPeriod("today")}
              className="h-12 px-6 text-base font-extrabold"
            >
              Hoy
            </Button>
            <Button
              type="button"
              variant={period === "month" ? "default" : "ghost"}
              aria-pressed={period === "month"}
              onClick={() => setPeriod("month")}
              className="h-12 px-6 text-base font-extrabold"
            >
              Este Mes
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-5 px-4 sm:px-6 lg:grid-cols-[220px_1fr]">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <div className="rounded-lg border-2 border-gold bg-secondary p-4">
              <p className="text-sm font-bold text-muted-foreground">
                {period === "today" ? "Ventas de hoy" : "Acumulado del mes"}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-primary sm:text-3xl">{formatCOP(chartTotal)}</p>
            </div>
            <div className="rounded-lg border-2 border-border bg-background p-4">
              <p className="text-sm font-bold text-muted-foreground">
                {period === "today" ? "Hora más fuerte" : "Promedio diario"}
              </p>
              <p className="mt-1 text-xl font-extrabold text-foreground sm:text-2xl">
                {period === "today" ? peak?.label : formatCOP(Math.round(chartTotal / MONTH_SALES.length))}
              </p>
              {period === "today" && peak ? (
                <p className="mt-1 text-sm font-bold text-primary">{formatCOP(peak.sales)}</p>
              ) : null}
            </div>
          </div>

          <ChartContainer config={chartConfig} className="h-80 w-full min-w-0 aspect-auto sm:h-96">
            {period === "today" ? (
              <BarChart accessibilityLayer data={chartData} margin={{ left: 4, right: 12, top: 8 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={1} minTickGap={8} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={58}
                  tickFormatter={(value: number) => compactCOP.format(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel formatter={(value) => <span className="font-bold text-foreground">{formatCOP(Number(value))}</span>} />}
                />
                <Bar
                  dataKey="sales"
                  fill="var(--color-sales)"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={54}
                  isAnimationActive={false}
                />
              </BarChart>
            ) : (
              <LineChart accessibilityLayer data={chartData} margin={{ left: 4, right: 18, top: 12 }}>
                <CartesianGrid vertical={false} strokeDasharray="4 4" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} interval={2} minTickGap={12} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={58}
                  tickFormatter={(value: number) => compactCOP.format(value)}
                />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel formatter={(value) => <span className="font-bold text-foreground">{formatCOP(Number(value))}</span>} />}
                />
                <Line
                  type="monotone"
                  dataKey="sales"
                  stroke="var(--color-sales)"
                  strokeWidth={4}
                  dot={{ fill: "var(--gold)", stroke: "var(--primary)", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 7 }}
                  isAnimationActive={false}
                />
              </LineChart>
            )}
          </ChartContainer>
        </div>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border-4 border-primary bg-card p-6 shadow-md">
          <p className="text-lg font-bold text-muted-foreground">💰 Ventas del día</p>
          <p className="mt-2 text-4xl font-extrabold text-primary">{formatCOP(ventasDia)}</p>
        </div>
        <div className="rounded-2xl border-4 border-accent bg-card p-6 shadow-md">
          <p className="text-lg font-bold text-muted-foreground">🤝 Pedidos entregados</p>
          <p className="mt-2 text-4xl font-extrabold text-accent">{delivered.length}</p>
        </div>
        <div className="rounded-2xl border-4 border-gold bg-card p-6 shadow-md">
          <p className="text-lg font-bold text-muted-foreground">🔥 Pedidos activos</p>
          <p className="mt-2 text-4xl font-extrabold text-gold">{activos}</p>
        </div>
        <div className="rounded-2xl border-4 border-border bg-card p-6 shadow-md">
          <p className="text-lg font-bold text-muted-foreground">🧾 Total de pedidos</p>
          <p className="mt-2 text-4xl font-extrabold text-foreground">{orders.length}</p>
        </div>
      </div>

      <section aria-label="Pedidos entregados" className="mt-8">
        <h2 className="mb-3 font-display text-2xl text-foreground">Entregados hoy</h2>
        {delivered.length === 0 ? (
          <p className="rounded-2xl bg-secondary p-6 text-xl font-semibold text-muted-foreground">
            Aún no se ha entregado ningún pedido hoy.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border-4 border-border bg-card shadow-sm">
            <table className="w-full text-left text-lg">
              <thead className="bg-secondary text-base font-bold text-secondary-foreground">
                <tr>
                  <th className="px-4 py-3">Beeper</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {delivered.map((o) => (
                  <tr key={o.id} className="border-t border-border">
                    <td className="px-4 py-3 font-extrabold text-primary">#{o.beeper}</td>
                    <td className="px-4 py-3">{o.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatCOP(o.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-4 border-primary bg-secondary">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-xl font-extrabold">
                    Total entregado
                  </td>
                  <td className="px-4 py-3 text-right text-xl font-extrabold text-primary">{formatCOP(ventasEntregadas)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
