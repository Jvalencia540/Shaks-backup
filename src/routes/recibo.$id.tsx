import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { describeOptions, formatCOP } from "@/lib/shaks-store";
import { etiquetaCuenta, fetchCuenta, totalItems, type CuentaItem } from "@/lib/servicio";

// Recibo para la impresora del negocio (tirilla de 80 mm).
// ?pago=<id> imprime solo lo que pagó esa persona; ?auto=1 abre la impresión al cargar.
export const Route = createFileRoute("/recibo/$id")({
  validateSearch: (
    s: Record<string, unknown>,
  ): { pago?: string | undefined; auto?: number | undefined } => ({
    pago: typeof s["pago"] === "string" ? s["pago"] : undefined,
    auto: s["auto"] === 1 || s["auto"] === "1" ? 1 : undefined,
  }),
  head: () => ({ meta: [{ title: "Recibo — Shaks" }] }),
  component: ReciboPage,
});

const METODO: Record<string, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
};

// Junta líneas iguales (mismo producto, opciones y comentario) para que el recibo sea corto.
function agrupar(items: CuentaItem[]) {
  const m = new Map<string, { nombre: string; detalle: string; qty: number; precio: number }>();
  for (const i of items) {
    const detalle = describeOptions(i.opciones);
    const k = `${i.nombre}|${detalle}|${i.precio}`;
    const prev = m.get(k);
    if (prev) prev.qty += i.qty;
    else m.set(k, { nombre: i.nombre, detalle, qty: i.qty, precio: i.precio });
  }
  return [...m.values()];
}

function ReciboPage() {
  const { id } = Route.useParams();
  const { pago: pagoId, auto } = Route.useSearch();
  const cuentaQ = useQuery({ queryKey: ["cuenta", id], queryFn: () => fetchCuenta(id) });
  const cuenta = cuentaQ.data;
  const impreso = useRef(false);

  useEffect(() => {
    if (auto && cuenta && !impreso.current) {
      impreso.current = true;
      // Deja que el navegador pinte el recibo antes de abrir la impresión.
      setTimeout(() => window.print(), 300);
    }
  }, [auto, cuenta]);

  if (cuentaQ.isPending)
    return <p className="p-6 text-lg text-muted-foreground">Preparando recibo…</p>;
  if (cuentaQ.isError || !cuenta) {
    return <p className="p-6 text-lg font-bold text-destructive">No se encontró esta cuenta.</p>;
  }

  const pago = pagoId ? cuenta.pagos.find((p) => p.id === pagoId) : undefined;
  const items = pago ? cuenta.items.filter((i) => i.pago_id === pago.id) : cuenta.items;
  const total = totalItems(items);
  const pagado = cuenta.pagos.reduce((s, p) => s + p.monto, 0);
  const ahora = new Date().toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" });

  return (
    <main className="mx-auto max-w-md px-4 py-6 print:max-w-none print:p-0">
      <style>{`@media print { @page { size: 80mm auto; margin: 3mm; } html, body { background: #fff !important; } }`}</style>

      <div className="mb-4 flex flex-wrap gap-2 print:hidden">
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-primary px-5 py-3 text-lg font-extrabold text-primary-foreground"
        >
          🖨️ Imprimir
        </button>
        <Link
          to={cuenta.estado === "abierta" ? "/pedido/$id" : "/"}
          params={{ id }}
          className="rounded-xl border-2 border-border bg-card px-5 py-3 text-lg font-bold"
        >
          ← Volver
        </Link>
      </div>

      <article className="mx-auto w-[72mm] max-w-full bg-white p-3 font-mono text-[12px] leading-snug text-black shadow-md print:w-full print:p-0 print:shadow-none">
        <header className="text-center">
          <p className="text-[18px] font-extrabold tracking-widest">SHAKS</p>
          <p>{ahora}</p>
        </header>
        <hr className="my-2 border-dashed border-black" />
        <p className="font-bold">{etiquetaCuenta(cuenta)}</p>
        {cuenta.personas != null && <p>Personas: {cuenta.personas}</p>}
        {cuenta.tipo === "mesa" && cuenta.cliente && <p>Cliente: {cuenta.cliente}</p>}
        {cuenta.telefono && <p>Tel: {cuenta.telefono}</p>}
        {cuenta.direccion && <p>Dir: {cuenta.direccion}</p>}
        {cuenta.mesero && <p>Atendió: {cuenta.mesero}</p>}
        {pago && <p className="font-bold">Cuenta de: {pago.persona}</p>}
        <hr className="my-2 border-dashed border-black" />

        <table className="w-full">
          <tbody>
            {agrupar(items).map((l, i) => (
              <tr key={i} className="align-top">
                <td className="pr-1">
                  {l.qty}× {l.nombre}
                  {l.detalle && <div className="pl-3">{l.detalle}</div>}
                </td>
                <td className="whitespace-nowrap text-right">{formatCOP(l.precio * l.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <hr className="my-2 border-dashed border-black" />
        <p className="flex justify-between text-[15px] font-extrabold">
          <span>TOTAL</span>
          <span>{formatCOP(total)}</span>
        </p>

        {pago ? (
          <p className="mt-1 flex justify-between">
            <span>Pagado ({METODO[pago.metodo] ?? pago.metodo})</span>
            <span>{formatCOP(pago.monto)}</span>
          </p>
        ) : (
          cuenta.pagos.length > 0 && (
            <div className="mt-1">
              {cuenta.pagos.map((p) => (
                <p key={p.id} className="flex justify-between">
                  <span>
                    {p.persona} ({METODO[p.metodo] ?? p.metodo})
                  </span>
                  <span>{formatCOP(p.monto)}</span>
                </p>
              ))}
              {total - pagado > 0 && (
                <p className="flex justify-between font-bold">
                  <span>Saldo pendiente</span>
                  <span>{formatCOP(total - pagado)}</span>
                </p>
              )}
            </div>
          )
        )}

        <hr className="my-2 border-dashed border-black" />
        <p className="text-center">¡Gracias por su visita!</p>
      </article>
    </main>
  );
}
