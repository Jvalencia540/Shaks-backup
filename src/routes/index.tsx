import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import {
  abrirCuenta,
  actualizarMesa,
  anularCuenta,
  crearMesa,
  eliminarMesa,
  fetchCuentasAbiertas,
  fetchMesas,
  type Cuenta,
  type FormaMesa,
  type Mesa,
  type NuevaCuenta,
} from "@/lib/servicio";
import { LeyendaMesas, MapaMesas, celdaLibre } from "@/components/mesas/mapa-mesas";
import {
  AbrirMesa,
  EditorMesa,
  NuevaCuentaExterna,
  Panel,
  ResumenCuenta,
  TarjetaCuenta,
} from "@/components/mesas/paneles";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mesas — Shaks" },
      {
        name: "description",
        content: "Mapa de mesas del salón, pedidos para llevar y domicilios.",
      },
    ],
  }),
  component: MesasPage,
});

type Vista = "salon" | "llevar" | "domicilio";

function MesasPage() {
  const { rol, nombre } = useAuth();
  const esAdmin = rol === "admin";
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [vista, setVista] = useState<Vista>("salon");
  const [mesaSel, setMesaSel] = useState<string | null>(null);
  const [cuentaSel, setCuentaSel] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mesasQ = useQuery({ queryKey: ["mesas"], queryFn: fetchMesas, staleTime: 30_000 });
  const cuentasQ = useQuery({
    queryKey: ["cuentas-abiertas"],
    queryFn: fetchCuentasAbiertas,
    refetchInterval: 5_000,
  });
  const mesas = useMemo(() => mesasQ.data ?? [], [mesasQ.data]);
  const cuentas = useMemo(() => cuentasQ.data ?? [], [cuentasQ.data]);

  const cuentaPorMesa = useMemo(
    () => new Map(cuentas.filter((c) => c.mesa_id).map((c) => [c.mesa_id!, c])),
    [cuentas],
  );
  const llevar = cuentas.filter((c) => c.tipo === "llevar");
  const domicilios = cuentas.filter((c) => c.tipo === "domicilio");
  const mesa = mesas.find((m) => m.id === mesaSel) ?? null;
  const mesero = nombre ?? "";

  const refrescar = () => {
    qc.invalidateQueries({ queryKey: ["mesas"] });
    qc.invalidateQueries({ queryKey: ["cuentas-abiertas"] });
  };
  const onError = (e: Error) => setError(e.message);

  const abrir = useMutation({
    mutationFn: (c: NuevaCuenta) => abrirCuenta(c),
    onSuccess: (id) => {
      refrescar();
      navigate({ to: "/pedido/$id", params: { id } });
    },
    onError,
  });
  const anular = useMutation({
    mutationFn: (id: string) => anularCuenta(id),
    onSuccess: refrescar,
    onError,
  });
  const mover = useMutation({
    mutationFn: ({ m, x, y }: { m: Mesa; x: number; y: number }) => actualizarMesa(m.id, { x, y }),
    onMutate: ({ m, x, y }) => {
      // Se ve en su nuevo lugar de inmediato, sin esperar a Supabase.
      qc.setQueryData<Mesa[]>(["mesas"], (prev) =>
        prev?.map((o) => (o.id === m.id ? { ...o, x, y } : o)),
      );
    },
    onSettled: refrescar,
    onError,
  });
  const guardarMesa = useMutation({
    mutationFn: ({ id, cambios }: { id: string; cambios: { numero: number; forma: FormaMesa } }) =>
      actualizarMesa(id, cambios),
    onSuccess: () => {
      setError(null);
      refrescar();
    },
    onError: (e: Error) =>
      setError(
        e.message.includes("mesas_numero_key") ? "Ya existe una mesa con ese número." : e.message,
      ),
  });
  const borrarMesa = useMutation({
    mutationFn: (id: string) => eliminarMesa(id),
    onSuccess: () => {
      setMesaSel(null);
      refrescar();
    },
    onError,
  });
  const agregarMesa = useMutation({
    mutationFn: (forma: FormaMesa) => {
      const celda = celdaLibre(mesas);
      if (!celda) throw new Error("No queda espacio libre en el plano.");
      const numero = Math.max(0, ...mesas.map((m) => m.numero)) + 1;
      return crearMesa({ numero, forma, ...celda });
    },
    onSuccess: refrescar,
    onError,
  });

  const cambiarVista = (v: Vista) => {
    setVista(v);
    setError(null);
    setCuentaSel(null);
    if (v !== "salon") setEditando(false);
  };

  const pestaña = (v: Vista, texto: string, n?: number) => (
    <button
      role="tab"
      aria-selected={vista === v}
      onClick={() => cambiarVista(v)}
      className={`flex items-center gap-2 rounded-t-xl px-5 py-3 text-lg font-bold ${
        vista === v ? "bg-card text-primary" : "bg-secondary text-secondary-foreground"
      }`}
    >
      {texto}
      {n ? (
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-primary px-1.5 text-sm text-primary-foreground">
          {n}
        </span>
      ) : null}
    </button>
  );

  const cargando = mesasQ.isPending || cuentasQ.isPending;
  const fallo = mesasQ.error ?? cuentasQ.error;

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div role="tablist" aria-label="Tipo de servicio" className="flex flex-wrap gap-1">
          {pestaña("salon", "🍽️ Salón", cuentaPorMesa.size)}
          {pestaña("llevar", "🛍️ Para llevar", llevar.length)}
          {pestaña("domicilio", "🛵 Domicilio", domicilios.length)}
        </div>
        {vista === "salon" && esAdmin && (
          <button
            onClick={() => {
              setEditando((e) => !e);
              setError(null);
            }}
            className={`mb-1 rounded-xl px-4 py-2.5 text-base font-bold ${editando ? "bg-gold text-gold-foreground" : "border-2 border-border bg-card text-foreground"}`}
          >
            {editando ? "✓ Terminar edición" : "✏️ Editar plano"}
          </button>
        )}
      </div>

      {cargando ? (
        <p className="mt-4 rounded-2xl bg-secondary px-5 py-6 text-lg text-muted-foreground">
          Cargando…
        </p>
      ) : fallo ? (
        <div className="mt-4 rounded-2xl bg-destructive px-5 py-4 text-destructive-foreground">
          <p className="text-lg font-bold">No se pudieron cargar las mesas.</p>
          <p className="text-sm">{fallo.message}</p>
          <button
            onClick={refrescar}
            className="mt-3 rounded-xl bg-card px-4 py-2 text-base font-bold text-foreground"
          >
            Intentar de nuevo
          </button>
        </div>
      ) : vista === "salon" ? (
        <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
          <section aria-label="Plano del salón" className="flex min-w-0 flex-col gap-3">
            {editando ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold text-muted-foreground">Agregar:</span>
                <button
                  onClick={() => agregarMesa.mutate("cuadrada")}
                  disabled={agregarMesa.isPending}
                  className="rounded-xl bg-secondary px-4 py-2 font-bold text-secondary-foreground"
                >
                  ＋ Mesa cuadrada
                </button>
                <button
                  onClick={() => agregarMesa.mutate("redonda")}
                  disabled={agregarMesa.isPending}
                  className="rounded-xl bg-secondary px-4 py-2 font-bold text-secondary-foreground"
                >
                  ＋ Mesa redonda
                </button>
              </div>
            ) : (
              <LeyendaMesas />
            )}
            <MapaMesas
              mesas={mesas}
              cuentaPorMesa={cuentaPorMesa}
              seleccionada={mesaSel}
              onSeleccionar={(id) => {
                setMesaSel(id);
                setError(null);
              }}
              editando={editando}
              onMover={(m, x, y) => mover.mutate({ m, x, y })}
            />
          </section>

          {!mesa ? (
            <Panel
              titulo={editando ? "Editar plano" : "Seleccione una mesa"}
              tono={editando ? "gold" : "accent"}
            >
              <p className="text-base text-muted-foreground">
                {editando
                  ? "Arrastre las mesas para ubicarlas. Toque una para cambiar su número, su forma o borrarla."
                  : "Toque una mesa libre para abrirla, o una ocupada para tomar pedido o cobrar."}
              </p>
              {error && (
                <p
                  role="alert"
                  className="rounded-xl bg-destructive px-4 py-3 font-bold text-destructive-foreground"
                >
                  {error}
                </p>
              )}
            </Panel>
          ) : editando ? (
            <EditorMesa
              mesa={mesa}
              ocupada={cuentaPorMesa.has(mesa.id)}
              onGuardar={(cambios) => guardarMesa.mutate({ id: mesa.id, cambios })}
              onEliminar={() => borrarMesa.mutate(mesa.id)}
              guardando={guardarMesa.isPending || borrarMesa.isPending}
              error={error}
            />
          ) : cuentaPorMesa.has(mesa.id) ? (
            <ResumenCuenta
              cuenta={cuentaPorMesa.get(mesa.id)!}
              onAnular={() => anular.mutate(cuentaPorMesa.get(mesa.id)!.id)}
              anulando={anular.isPending}
            />
          ) : (
            <AbrirMesa
              mesa={mesa}
              mesero={mesero}
              onAbrir={(c) => abrir.mutate(c)}
              abriendo={abrir.isPending}
              error={error}
            />
          )}
        </div>
      ) : (
        <ServicioExterno
          tipo={vista}
          cuentas={vista === "llevar" ? llevar : domicilios}
          seleccionada={cuentaSel}
          onSeleccionar={setCuentaSel}
          mesero={mesero}
          onAbrir={(c) => abrir.mutate(c)}
          abriendo={abrir.isPending}
          onAnular={(id) => anular.mutate(id, { onSuccess: () => setCuentaSel(null) })}
          anulando={anular.isPending}
          error={error}
        />
      )}
    </main>
  );
}

function ServicioExterno({
  tipo,
  cuentas,
  seleccionada,
  onSeleccionar,
  mesero,
  onAbrir,
  abriendo,
  onAnular,
  anulando,
  error,
}: {
  tipo: "llevar" | "domicilio";
  cuentas: Cuenta[];
  seleccionada: string | null;
  onSeleccionar: (id: string | null) => void;
  mesero: string;
  onAbrir: (c: NuevaCuenta) => void;
  abriendo: boolean;
  onAnular: (id: string) => void;
  anulando: boolean;
  error: string | null;
}) {
  const cuenta = cuentas.find((c) => c.id === seleccionada);
  return (
    <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_360px]">
      <section
        aria-label={tipo === "llevar" ? "Pedidos para llevar" : "Domicilios"}
        className="flex flex-col gap-3"
      >
        <button
          onClick={() => onSeleccionar(null)}
          className="self-start rounded-xl bg-primary px-5 py-3 text-lg font-bold text-primary-foreground"
        >
          ＋ {tipo === "llevar" ? "Nuevo para llevar" : "Nuevo domicilio"}
        </button>
        {cuentas.length === 0 ? (
          <p className="rounded-2xl bg-secondary p-6 text-lg font-semibold text-muted-foreground">
            {tipo === "llevar"
              ? "No hay pedidos para llevar abiertos."
              : "No hay domicilios abiertos."}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {cuentas.map((c) => (
              <TarjetaCuenta
                key={c.id}
                cuenta={c}
                activa={c.id === seleccionada}
                onClick={() => onSeleccionar(c.id)}
              />
            ))}
          </div>
        )}
      </section>
      {cuenta ? (
        <ResumenCuenta cuenta={cuenta} onAnular={() => onAnular(cuenta.id)} anulando={anulando} />
      ) : (
        <NuevaCuentaExterna
          key={tipo}
          tipo={tipo}
          mesero={mesero}
          onAbrir={onAbrir}
          abriendo={abriendo}
          error={error}
        />
      )}
    </div>
  );
}
