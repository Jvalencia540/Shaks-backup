-- Mesas, cuentas (mesa / para llevar / domicilio), productos pedidos y pagos.
-- Reemplaza el flujo de beepers. Todo vive en Supabase para que meseros,
-- cocina y administrador vean lo mismo desde cualquier dispositivo.
-- Ejecutar una vez en Supabase: SQL Editor → pegar → Run.

begin;

-- ¿El usuario actual es administrador?
create or replace function public.es_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.perfiles where id = auth.uid() and rol = 'admin');
$$;

-- Plano del salón. x, y = celda de la cuadrícula (0 = arriba / izquierda).
create table if not exists public.mesas (
  id uuid primary key default gen_random_uuid(),
  numero int not null unique check (numero > 0),
  forma text not null default 'cuadrada' check (forma in ('cuadrada', 'redonda')),
  x int not null check (x >= 0),
  y int not null check (y >= 0),
  created_at timestamptz not null default now(),
  unique (x, y)
);

-- Una cuenta es un servicio abierto: una mesa ocupada, un pedido para llevar o un domicilio.
create table if not exists public.cuentas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('mesa', 'llevar', 'domicilio')),
  mesa_id uuid references public.mesas (id) on delete restrict,
  personas int check (personas is null or personas > 0),
  cliente text,
  telefono text,
  direccion text,
  comentario text,
  mesero_id uuid references auth.users (id) default auth.uid(),
  mesero text,
  estado text not null default 'abierta' check (estado in ('abierta', 'cerrada', 'anulada')),
  created_at timestamptz not null default now(),
  cerrada_at timestamptz,
  check ((tipo = 'mesa') = (mesa_id is not null))
);

-- Una mesa solo puede tener una cuenta abierta a la vez.
create unique index if not exists cuentas_una_abierta_por_mesa
  on public.cuentas (mesa_id) where estado = 'abierta';

create table if not exists public.pagos (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.cuentas (id) on delete cascade,
  persona text not null,
  monto numeric not null check (monto >= 0),
  metodo text not null default 'efectivo' check (metodo in ('efectivo', 'tarjeta', 'transferencia')),
  created_at timestamptz not null default now()
);

-- Cada producto enviado a cocina. "ronda" agrupa lo que se envió junto.
create table if not exists public.cuenta_items (
  id uuid primary key default gen_random_uuid(),
  cuenta_id uuid not null references public.cuentas (id) on delete cascade,
  ronda int not null default 1,
  nombre text not null,
  precio numeric not null check (precio >= 0),
  qty int not null check (qty > 0),
  opciones jsonb not null default '[]'::jsonb,
  comentario text,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'listo', 'entregado')),
  pago_id uuid references public.pagos (id) on delete set null,
  created_at timestamptz not null default now(),
  listo_at timestamptz,
  entregado_at timestamptz
);

create index if not exists cuenta_items_cuenta on public.cuenta_items (cuenta_id);
create index if not exists cuenta_items_estado on public.cuenta_items (estado) where estado <> 'entregado';
create index if not exists cuentas_estado on public.cuentas (estado, created_at);

-- Permisos: cualquier usuario con sesión opera cuentas, productos y pagos;
-- solo el admin cambia el plano de mesas.
alter table public.mesas enable row level security;
alter table public.cuentas enable row level security;
alter table public.cuenta_items enable row level security;
alter table public.pagos enable row level security;

drop policy if exists "mesas: leer" on public.mesas;
create policy "mesas: leer" on public.mesas for select to authenticated using (true);
drop policy if exists "mesas: admin escribe" on public.mesas;
create policy "mesas: admin escribe" on public.mesas for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

drop policy if exists "cuentas: personal" on public.cuentas;
create policy "cuentas: personal" on public.cuentas for all to authenticated using (true) with check (true);
drop policy if exists "cuenta_items: personal" on public.cuenta_items;
create policy "cuenta_items: personal" on public.cuenta_items for all to authenticated using (true) with check (true);
drop policy if exists "pagos: personal" on public.pagos;
create policy "pagos: personal" on public.pagos for all to authenticated using (true) with check (true);

-- Plano inicial: el mismo del sistema de referencia (14 mesas).
insert into public.mesas (numero, forma, x, y) values
  (12, 'redonda', 1, 0), (13, 'redonda', 3, 0),
  (11, 'redonda', 0, 1), (14, 'redonda', 4, 1),
  (1, 'cuadrada', 0, 2), (6, 'redonda', 2, 2), (7, 'cuadrada', 4, 2),
  (2, 'cuadrada', 0, 3), (5, 'redonda', 2, 3), (8, 'cuadrada', 4, 3),
  (4, 'redonda', 2, 4), (9, 'cuadrada', 4, 4),
  (3, 'redonda', 2, 5), (10, 'cuadrada', 4, 5)
on conflict (numero) do nothing;

commit;

notify pgrst, 'reload schema';
