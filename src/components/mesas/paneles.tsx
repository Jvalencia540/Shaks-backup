import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { formatCOP } from "@/lib/shaks-store";
import {
  etiquetaCuenta,
  totalItems,
  type Cuenta,
  type FormaMesa,
  type Mesa,
  type NuevaCuenta,
} from "@/lib/servicio";
import { EditarCuentaDialog } from "@/components/pedido/editar-cuenta-dialog";

const input =
  "h-12 w-full rounded-xl border-2 border-input bg-background px-3 text-base outline-none focus:border-primary";
const btnPrimario =
  "min-h-14 rounded-2xl bg-primary px-5 text-lg font-extrabold text-primary-foreground shadow transition-transform enabled:active:scale-95 disabled:cursor-not-allowed disabled:opacity-40";
const btnSecundario =
  "min-h-12 rounded-xl border-2 border-border bg-card px-4 text-base font-bold text-foreground transition-colors hover:bg-secondary disabled:opacity-40";

export function Panel({
  titulo,
  tono = "accent",
  children,
}: {
  titulo: string;
  tono?: "accent" | "primary" | "gold";
  children: ReactNode;
}) {
  const tonos = {
    accent: "bg-accent text-accent-foreground",
    primary: "bg-primary text-primary-foreground",
    gold: "bg-gold text-gold-foreground",
  };
  return (
    <aside className="overflow-hidden rounded-2xl border-4 border-border bg-card">
      <h2 className={`px-5 py-3 font-display text-2xl ${tonos[tono]}`}>{titulo}</h2>
      <div className="flex flex-col gap-4 p-5">{children}</div>
    </aside>
  );
}

function Campo({
  label,
  requerido,
  children,
}: {
  label: string;
  requerido?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-base font-bold text-foreground">
        {label}
        {requerido && <span className="text-destructive"> *</span>}
      </span>
      {children}
    </label>
  );
}

function minutosDesde(iso: string) {
  return Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000));
}

// ---------- Mesa libre: abrir ----------

export function AbrirMesa({
  mesa,
  mesero,
  onAbrir,
  abriendo,
  error,
}: {
  mesa: Mesa;
  mesero: string;
  onAbrir: (c: NuevaCuenta) => void;
  abriendo: boolean;
  error: string | null;
}) {
  const [personas, setPersonas] = useState(2);
  const [cliente, setCliente] = useState("");
  const [comentario, setComentario] = useState("");

  useEffect(() => {
    setPersonas(2);
    setCliente("");
    setComentario("");
  }, [mesa.id]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    onAbrir({
      tipo: "mesa",
      mesa_id: mesa.id,
      personas,
      cliente: cliente.trim() || null,
      comentario: comentario.trim() || null,
      mesero,
    });
  };

  return (
    <Panel titulo={`Mesa ${mesa.numero}`}>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-bold text-foreground">
            Personas<span className="text-destructive"> *</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Menos personas"
              onClick={() => setPersonas((p) => Math.max(1, p - 1))}
              className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-2xl font-extrabold text-secondary-foreground active:scale-95"
            >
              −
            </button>
            <span className="w-8 text-center text-2xl font-extrabold tabular-nums">{personas}</span>
            <button
              type="button"
              aria-label="Más personas"
              onClick={() => setPersonas((p) => p + 1)}
              className="grid h-12 w-12 place-items-center rounded-xl bg-secondary text-2xl font-extrabold text-secondary-foreground active:scale-95"
            >
              +
            </button>
          </div>
        </div>
        <Campo label="Cliente">
          <input
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            maxLength={80}
            className={input}
          />
        </Campo>
        <Campo label="Mesero">
          <input
            value={mesero}
            readOnly
            className={`${input} bg-secondary text-muted-foreground`}
          />
        </Campo>
        <Campo label="Comentario">
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={2}
            maxLength={200}
            className={`${input} h-auto py-2`}
          />
        </Campo>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive px-4 py-3 font-bold text-destructive-foreground"
          >
            {error}
          </p>
        )}
        <button type="submit" disabled={abriendo} className={btnPrimario}>
          {abriendo ? "Abriendo…" : "Abrir mesa"}
        </button>
      </form>
    </Panel>
  );
}

// ---------- Cuenta abierta (mesa, para llevar o domicilio) ----------

export function ResumenCuenta({
  cuenta,
  onAnular,
  anulando,
}: {
  cuenta: Cuenta;
  onAnular: () => void;
  anulando: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const total = totalItems(cuenta.items);
  const pagado = cuenta.pagos.reduce((s, p) => s + p.monto, 0);
  const listos = cuenta.items.filter((i) => i.estado === "listo").reduce((s, i) => s + i.qty, 0);
  const enCocina = cuenta.items
    .filter((i) => i.estado === "pendiente")
    .reduce((s, i) => s + i.qty, 0);
  const sinItems = cuenta.items.length === 0;

  return (
    <Panel titulo={etiquetaCuenta(cuenta)} tono={listos > 0 ? "gold" : "primary"}>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-base">
        {cuenta.personas != null && (
          <>
            <dt className="font-bold text-muted-foreground">Personas</dt>
            <dd className="font-semibold">{cuenta.personas}</dd>
          </>
        )}
        {cuenta.cliente && cuenta.tipo === "mesa" && (
          <>
            <dt className="font-bold text-muted-foreground">Cliente</dt>
            <dd className="font-semibold">{cuenta.cliente}</dd>
          </>
        )}
        {cuenta.telefono && (
          <>
            <dt className="font-bold text-muted-foreground">Teléfono</dt>
            <dd className="font-semibold">{cuenta.telefono}</dd>
          </>
        )}
        {cuenta.direccion && (
          <>
            <dt className="font-bold text-muted-foreground">Dirección</dt>
            <dd className="font-semibold">{cuenta.direccion}</dd>
          </>
        )}
        <dt className="font-bold text-muted-foreground">Mesero</dt>
        <dd className="truncate font-semibold">{cuenta.mesero ?? "—"}</dd>
        <dt className="font-bold text-muted-foreground">Abierta hace</dt>
        <dd className="font-semibold">{minutosDesde(cuenta.created_at)} min</dd>
      </dl>
      {cuenta.comentario && (
        <p className="rounded-xl bg-secondary px-3 py-2 text-base font-semibold">
          📝 {cuenta.comentario}
        </p>
      )}

      <div className="flex flex-wrap gap-2 text-sm font-bold">
        {enCocina > 0 && (
          <span className="rounded-lg bg-info px-3 py-1 text-info-foreground">
            🔥 {enCocina} en cocina
          </span>
        )}
        {listos > 0 && (
          <span className="rounded-lg bg-gold px-3 py-1 text-gold-foreground">
            🔔 {listos} listos para llevar
          </span>
        )}
        {cuenta.pagos.length > 0 && (
          <span className="rounded-lg bg-accent px-3 py-1 text-accent-foreground">
            💵 {formatCOP(pagado)} pagado
          </span>
        )}
      </div>

      <p className="flex items-baseline justify-between text-lg font-bold">
        Total <span className="text-3xl font-extrabold text-primary">{formatCOP(total)}</span>
      </p>

      <Link
        to="/pedido/$id"
        params={{ id: cuenta.id }}
        className={`${btnPrimario} grid place-items-center`}
      >
        🧾 Tomar pedido
      </Link>
      <Link
        to="/cobrar/$id"
        params={{ id: cuenta.id }}
        disabled={sinItems}
        className={`${btnSecundario} grid place-items-center ${sinItems ? "pointer-events-none opacity-40" : ""}`}
      >
        💵 Cobrar / dividir cuenta
      </Link>
      <div className="grid grid-cols-2 gap-2">
        <Link
          to="/recibo/$id"
          params={{ id: cuenta.id }}
          search={{ auto: 1 }}
          disabled={sinItems}
          className={`${btnSecundario} grid place-items-center ${sinItems ? "pointer-events-none opacity-40" : ""}`}
        >
          🖨️ Imprimir
        </Link>
        <button
          onClick={() => setEditando(true)}
          disabled={sinItems && cuenta.tipo !== "mesa"}
          className={btnSecundario}
        >
          {sinItems ? "🔀 Cambiar mesa" : "✏️ Editar"}
        </button>
      </div>
      <EditarCuentaDialog cuenta={cuenta} open={editando} onClose={() => setEditando(false)} />
      {sinItems && (
        <button
          onClick={onAnular}
          disabled={anulando}
          className="text-base font-bold text-destructive underline underline-offset-2"
        >
          {anulando ? "Anulando…" : "Anular (se abrió por error)"}
        </button>
      )}
    </Panel>
  );
}

// ---------- Para llevar / Domicilio ----------

export function NuevaCuentaExterna({
  tipo,
  mesero,
  onAbrir,
  abriendo,
  error,
}: {
  tipo: "llevar" | "domicilio";
  mesero: string;
  onAbrir: (c: NuevaCuenta) => void;
  abriendo: boolean;
  error: string | null;
}) {
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [comentario, setComentario] = useState("");
  const domicilio = tipo === "domicilio";
  const valido = cliente.trim() && (!domicilio || (telefono.trim() && direccion.trim()));

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!valido) return;
    onAbrir({
      tipo,
      cliente: cliente.trim(),
      telefono: domicilio ? telefono.trim() : null,
      direccion: domicilio ? direccion.trim() : null,
      comentario: comentario.trim() || null,
      mesero,
    });
  };

  return (
    <Panel titulo={domicilio ? "Nuevo domicilio" : "Nuevo para llevar"}>
      <form onSubmit={enviar} className="flex flex-col gap-4">
        <Campo label="Cliente" requerido>
          <input
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            maxLength={80}
            required
            className={input}
          />
        </Campo>
        {domicilio && (
          <>
            <Campo label="Teléfono" requerido>
              <input
                type="tel"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                maxLength={20}
                required
                className={input}
              />
            </Campo>
            <Campo label="Dirección" requerido>
              <input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                maxLength={160}
                required
                className={input}
              />
            </Campo>
          </>
        )}
        <Campo label="Comentario">
          <textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            rows={2}
            maxLength={200}
            className={`${input} h-auto py-2`}
          />
        </Campo>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-destructive px-4 py-3 font-bold text-destructive-foreground"
          >
            {error}
          </p>
        )}
        <button type="submit" disabled={!valido || abriendo} className={btnPrimario}>
          {abriendo ? "Creando…" : domicilio ? "Crear domicilio" : "Crear pedido para llevar"}
        </button>
      </form>
    </Panel>
  );
}

export function TarjetaCuenta({
  cuenta,
  activa,
  onClick,
}: {
  cuenta: Cuenta;
  activa: boolean;
  onClick: () => void;
}) {
  const listos = cuenta.items.some((i) => i.estado === "listo");
  return (
    <button
      onClick={onClick}
      aria-pressed={activa}
      className={`flex flex-col gap-1 rounded-2xl border-4 p-4 text-left shadow-sm transition-transform active:scale-[0.98] ${
        listos ? "border-gold bg-gold/15" : "border-primary bg-card"
      } ${activa ? "ring-4 ring-gold" : ""}`}
    >
      <span className="text-lg font-extrabold text-foreground">
        {cuenta.cliente ?? etiquetaCuenta(cuenta)}
      </span>
      {cuenta.direccion && (
        <span className="text-sm font-semibold text-muted-foreground">{cuenta.direccion}</span>
      )}
      <span className="flex items-center justify-between gap-2 text-base font-bold">
        <span className="text-muted-foreground">{minutosDesde(cuenta.created_at)} min</span>
        <span className="text-primary">{formatCOP(totalItems(cuenta.items))}</span>
      </span>
      {listos && (
        <span className="text-sm font-extrabold text-gold-foreground">🔔 Listo para entregar</span>
      )}
    </button>
  );
}

// ---------- Edición del plano (solo admin) ----------

export function EditorMesa({
  mesa,
  ocupada,
  onGuardar,
  onEliminar,
  guardando,
  error,
}: {
  mesa: Mesa;
  ocupada: boolean;
  onGuardar: (cambios: { numero: number; forma: FormaMesa }) => void;
  onEliminar: () => void;
  guardando: boolean;
  error: string | null;
}) {
  const [numero, setNumero] = useState(String(mesa.numero));
  const [forma, setForma] = useState<FormaMesa>(mesa.forma);
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    setNumero(String(mesa.numero));
    setForma(mesa.forma);
    setConfirmar(false);
  }, [mesa.id, mesa.numero, mesa.forma]);

  const n = Number(numero);
  const valido = Number.isInteger(n) && n > 0;
  const cambio = valido && (n !== mesa.numero || forma !== mesa.forma);

  return (
    <Panel titulo={`Editar mesa ${mesa.numero}`} tono="gold">
      <p className="text-base text-muted-foreground">Arrastre la mesa en el plano para moverla.</p>
      <Campo label="Número" requerido>
        <input
          type="number"
          min={1}
          inputMode="numeric"
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          className={input}
        />
      </Campo>
      <div className="flex flex-col gap-1.5">
        <span className="text-base font-bold text-foreground">Forma</span>
        <div className="grid grid-cols-2 gap-2">
          {(["cuadrada", "redonda"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={forma === f}
              onClick={() => setForma(f)}
              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-base font-bold ${
                forma === f
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              <span
                className={`h-5 w-5 border-2 border-current ${f === "redonda" ? "rounded-full" : "rounded-sm"}`}
              />
              {f === "cuadrada" ? "Cuadrada" : "Redonda"}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p
          role="alert"
          className="rounded-xl bg-destructive px-4 py-3 font-bold text-destructive-foreground"
        >
          {error}
        </p>
      )}
      <button
        disabled={!cambio || guardando}
        onClick={() => onGuardar({ numero: n, forma })}
        className={btnPrimario}
      >
        {guardando ? "Guardando…" : "Guardar cambios"}
      </button>
      {ocupada ? (
        <p className="text-base font-semibold text-muted-foreground">
          No se puede borrar: la mesa tiene una cuenta abierta.
        </p>
      ) : confirmar ? (
        <div className="flex gap-2">
          <button
            onClick={onEliminar}
            disabled={guardando}
            className="min-h-12 flex-1 rounded-xl bg-destructive font-bold text-destructive-foreground"
          >
            Sí, borrar mesa {mesa.numero}
          </button>
          <button onClick={() => setConfirmar(false)} className={btnSecundario}>
            Cancelar
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmar(true)}
          className="text-base font-bold text-destructive underline underline-offset-2"
        >
          Borrar mesa
        </button>
      )}
    </Panel>
  );
}
