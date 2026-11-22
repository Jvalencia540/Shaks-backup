-- Opciones que el mesero elige al agregar un producto (salsa, shot, sabor...).
-- Formato: [{"nombre": "Salsa", "valores": ["BBQ", "MM (miel mostaza)", "Combinadas"]}]
-- Cada opción es obligatoria y se elige un solo valor.
-- Ejecutar una vez en Supabase: SQL Editor → pegar → Run.

begin;

alter table public.productos
  add column if not exists opciones jsonb not null default '[]'::jsonb;

-- Alitas y combos familiares: salsa.
update public.productos
set opciones = '[{"nombre": "Salsa", "valores": ["BBQ", "MM (miel mostaza)", "Combinadas"]}]'::jsonb
where categoria = 'Alitas';

-- Cerveza envenenada: un solo producto con shot y jarabe.
delete from public.productos where nombre like 'Cerveza Envenenada %';
insert into public.productos (nombre, precio, categoria, opciones) values
  ('Cerveza Envenenada', 15000, 'Bebidas con alcohol',
   '[{"nombre": "Shot", "valores": ["Ginebra", "Vodka", "Tequila", "Whiskey"]},
     {"nombre": "Jarabe", "valores": ["Mango biche", "Maracuyá", "Kiwi", "Sandía", "Durazno"]}]'::jsonb);

-- Peceras: licor y sabor.
update public.productos
set opciones = '[{"nombre": "Licor", "valores": ["Vodka", "Tequila", "Ginebra", "Whisky", "Cerveza Corona"]},
                 {"nombre": "Sabor", "valores": ["Mora azul", "Sandía", "Kiwi", "Mango biche", "Maracuyá"]}]'::jsonb
where nombre in ('Pecera x 2', 'Pecera x 4');

commit;

notify pgrst, 'reload schema';
