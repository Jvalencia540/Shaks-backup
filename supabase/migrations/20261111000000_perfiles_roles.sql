-- Roles de Shaks: cada usuario de Supabase Auth tiene un perfil con su rol.
--   admin    → Caja, Cocina y Métricas
--   personal → Caja y Cocina
-- Ejecutar una vez en Supabase: SQL Editor → New query → pegar → Run.

create table if not exists public.perfiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nombre text,
  rol text not null default 'personal' check (rol in ('admin', 'personal')),
  created_at timestamptz not null default now()
);

alter table public.perfiles enable row level security;

-- Cada usuario solo puede leer su propio perfil. Nadie puede cambiar su rol
-- desde la app: los roles se asignan desde el panel de Supabase.
drop policy if exists "perfiles: leer el propio" on public.perfiles;
create policy "perfiles: leer el propio"
  on public.perfiles for select
  to authenticated
  using (auth.uid() = id);

-- Al crear un usuario nuevo se le asigna automáticamente el rol "personal".
create or replace function public.crear_perfil_nuevo_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.perfiles (id, nombre)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nombre', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists al_crear_usuario on auth.users;
create trigger al_crear_usuario
  after insert on auth.users
  for each row execute function public.crear_perfil_nuevo_usuario();

-- Perfiles para usuarios que ya existían antes de esta migración.
insert into public.perfiles (id, nombre)
select id, email from auth.users
on conflict (id) do nothing;

-- Para volver admin a un usuario (cambiar el correo):
-- update public.perfiles set rol = 'admin'
-- where id = (select id from auth.users where email = 'admin@ejemplo.com');
