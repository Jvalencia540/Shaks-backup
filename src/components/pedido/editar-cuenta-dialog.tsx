import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth";
import {
  cambiarMesa,
  eliminarItems,
  etiquetaCuenta,
  fetchCuentasAbiertas,
  fetchMesas,
  moverItems,
  type Cuenta,
  type DestinoMover,
} from "@/lib/servicio";
import {
  SelectorItems,
  aLista,
  unidades,
  type Seleccion,
} from "@/components/pedido/selector-items";

type Pestaña = "cambiar" | "mover" | "eliminar";

const btnPrimario =
  "min-h-14 w-full rounded-2xl bg-primary px-5 text-lg font-extrabold text-primary-foreground shadow transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";

// Editar una cuenta abierta: cambiarla de mesa, mover productos a otra mesa
// o eliminar productos. Lo pagado no se toca.
export function EditarCuentaDialog({
  cuenta,
  open,
  onClose,
}: {
  cuenta: Cuenta;
  open: boolean;
  onClose: () => void;
}) {
  const esMesa = cuenta.tipo === "mesa";
  const [pestaña, setPestaña] = useState<Pestaña>(esMesa ? "cambiar" : "mover");
  const [sel, setSel] = useState<Seleccion>({});
  const [destino, setDestino] = useState<string | null>(null); // "c:<cuentaId>" | "m:<mesaId>"
  const [confirmar, setConfirmar] = useState(false);
  const { nombre } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const mesasQ = useQuery({ queryKey: ["mesas"], queryFn: fetchMesas, enabled: open });
  const cuentasQ = useQuery({
    queryKey: ["cuentas-abiertas"],
    queryFn: fetchCuentasAbiertas,
    enabled: open,
  });
  const ocupadas = new Map(
    (cuentasQ.data ?? []).filter((c) => c.mesa_id).map((c) => [c.mesa_id!, c]),
  );
  const mesasLibres = (mesasQ.data ?? []).filter((m) => !ocupadas.has(m.id));
  const otrasCuentas = (cuentasQ.data ?? []).filter((c) => c.id !== cuenta.id);
  const sinPagar = cuenta.items.filter((i) => !i.pago_id);

  const reiniciar = (p: Pestaña) => {
    setPestaña(p);
    setSel({});
    setDestino(null);
    setConfirmar(false);
  };
  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["cuenta"] });
    qc.invalidateQueries({ queryKey: ["cuentas-abiertas"] });
    qc.invalidateQueries({ queryKey: ["comandas"] });
  };

  const cambiar = useMutation({
    mutationFn: (mesaId: string) => cambiarMesa(cuenta.id, mesaId),
    onSuccess: () => {
      refrescar();
      onClose();
    },
  });
  const mover = useMutation({
    mutationFn: () => {
      if (!destino) throw new Error("Elija la mesa de destino.");
      const d: DestinoMover = destino.startsWith("c:")
        ? { cuentaId: destino.slice(2) }
        : { mesaId: destino.slice(2), mesero: nombre };
      return moverItems(cuenta, d, aLista(sel));
    },
    onSuccess: () => {
      refrescar();
      reiniciar("mover");
      onClose();
    },
  });
  const eliminar = useMutation({
    mutationFn: () => eliminarItems(cuenta, aLista(sel)),
    onSuccess: ({ cerrada }) => {
      refrescar();
      reiniciar("eliminar");
      onClose();
      if (cerrada) navigate({ to: "/" });
    },
  });

  const error = cambiar.error ?? mover.error ?? eliminar.error;
  const n = unidades(sel);

  const tab = (p: Pestaña, texto: string) => (
    <button
      type="button"
      role="tab"
      aria-selected={pestaña === p}
      onClick={() => reiniciar(p)}
      className={`flex-1 rounded-xl px-3 py-2.5 text-base font-bold ${
        pestaña === p
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground"
      }`}
    >
      {texto}
    </button>
  );

  const chip = (valor: string, texto: string) => (
    <button
      key={valor}
      type="button"
      aria-pressed={destino === valor}
      onClick={() => setDestino(valor)}
      className={`min-h-12 rounded-xl px-4 text-base font-bold ${
        destino === valor
          ? "bg-primary text-primary-foreground ring-4 ring-gold"
          : "bg-secondary text-secondary-foreground"
      }`}
    >
      {texto}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl border-4 border-border bg-card sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="pr-8 font-display text-2xl text-foreground">
            Editar · {etiquetaCuenta(cuenta)}
          </DialogTitle>
          <DialogDescription className="text-base text-muted-foreground">
            Los productos ya pagados no se pueden mover ni eliminar.
          </DialogDescription>
        </DialogHeader>

        <div role="tablist" className="flex flex-wrap gap-2">
          {esMesa && tab("cambiar", "🔀 Cambiar de mesa")}
          {tab("mover", "➡️ Mover productos")}
          {tab("eliminar", "🗑️ Eliminar productos")}
        </div>

        {pestaña === "cambiar" && esMesa && (
          <div className="flex flex-col gap-3">
            <p className="text-base font-semibold">
              Toda la cuenta pasa a la mesa que elija. Solo se muestran mesas libres.
            </p>
            {mesasLibres.length === 0 ? (
              <p className="text-base text-muted-foreground">No hay mesas libres.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {mesasLibres.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={destino === `m:${m.id}`}
                    onClick={() => setDestino(`m:${m.id}`)}
                    className={`grid h-14 place-items-center border-4 font-display text-xl ${
                      m.forma === "redonda" ? "rounded-full" : "rounded-xl"
                    } ${destino === `m:${m.id}` ? "border-primary bg-primary text-primary-foreground" : "border-accent bg-card text-accent"}`}
                  >
                    {m.numero}
                  </button>
                ))}
              </div>
            )}
            <button
              type="button"
              disabled={!destino || cambiar.isPending}
              onClick={() => destino && cambiar.mutate(destino.slice(2))}
              className={btnPrimario}
            >
              {cambiar.isPending
                ? "Cambiando…"
                : destino
                  ? `Pasar a la mesa ${mesasLibres.find((m) => `m:${m.id}` === destino)?.numero ?? ""}`
                  : "Elija una mesa"}
            </button>
          </div>
        )}

        {pestaña === "mover" && (
          <div className="flex flex-col gap-3">
            <p className="text-base font-semibold">1. Elija qué productos mover</p>
            <SelectorItems items={sinPagar} sel={sel} onChange={setSel} />
            <p className="text-base font-semibold">2. ¿A dónde van?</p>
            {otrasCuentas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {otrasCuentas.map((c) => chip(`c:${c.id}`, etiquetaCuenta(c)))}
              </div>
            )}
            {mesasLibres.length > 0 && (
              <>
                <p className="text-sm font-bold text-muted-foreground">
                  Mesas libres (se abren al mover):
                </p>
                <div className="flex flex-wrap gap-2">
                  {mesasLibres.map((m) => chip(`m:${m.id}`, `Mesa ${m.numero}`))}
                </div>
              </>
            )}
            <button
              type="button"
              disabled={n === 0 || !destino || mover.isPending}
              onClick={() => mover.mutate()}
              className={btnPrimario}
            >
              {mover.isPending
                ? "Moviendo…"
                : n === 0
                  ? "Elija productos"
                  : !destino
                    ? "Elija el destino"
                    : `Mover ${n} producto${n === 1 ? "" : "s"}`}
            </button>
          </div>
        )}

        {pestaña === "eliminar" && (
          <div className="flex flex-col gap-3">
            <p className="text-base font-semibold">
              Elija qué quitar de la cuenta. Si ya estaba en cocina, avise al cocinero.
            </p>
            <SelectorItems
              items={sinPagar}
              sel={sel}
              onChange={(s) => {
                setSel(s);
                setConfirmar(false);
              }}
            />
            {confirmar ? (
              <div className="flex flex-col gap-2 rounded-xl bg-destructive/10 p-3">
                <p className="text-base font-bold text-destructive">
                  ¿Eliminar {n} producto{n === 1 ? "" : "s"}? No se puede deshacer.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={eliminar.isPending}
                    onClick={() => eliminar.mutate()}
                    className="min-h-12 flex-1 rounded-xl bg-destructive font-bold text-destructive-foreground"
                  >
                    {eliminar.isPending ? "Eliminando…" : "Sí, eliminar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmar(false)}
                    className="min-h-12 rounded-xl border-2 border-border bg-card px-4 font-bold"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={n === 0}
                onClick={() => setConfirmar(true)}
                className="min-h-14 w-full rounded-2xl bg-destructive px-5 text-lg font-extrabold text-destructive-foreground disabled:opacity-40"
              >
                {n === 0 ? "Elija productos" : `Eliminar ${n} producto${n === 1 ? "" : "s"}`}
              </button>
            )}
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive px-4 py-3 font-bold text-destructive-foreground"
          >
            {error.message}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
