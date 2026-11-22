-- Menú real de Shaks (MENU 2026). Reemplaza los productos de prueba.
-- Categorías = títulos de cada página del PDF. Precios en pesos colombianos.
-- Ejecutar en Supabase: SQL Editor → pegar → Run.

begin;

delete from public.productos;

insert into public.productos (nombre, precio, categoria) values
  -- ENTRADAS
  ('Papitas a la Francesa (200 g)', 7500, 'Entradas'),
  ('Yuquitas', 6500, 'Entradas'),
  ('Huevos de Codorniz (10 unidades)', 8000, 'Entradas'),
  ('Arepitas (jamón y queso)', 5500, 'Entradas'),
  ('Ensalada', 4000, 'Entradas'),
  ('Deditos de Queso', 7000, 'Entradas'),
  ('Canasta de Patacón Mixta', 11000, 'Entradas'),
  ('Empanadas 6 unidades', 13000, 'Entradas'),

  -- ALITAS
  ('Alitas Personal x 5', 19800, 'Alitas'),
  ('Alitas x 7 unidades', 23800, 'Alitas'),
  ('Alitas x 10 unidades', 34800, 'Alitas'),
  ('Alitas x 14 unidades', 45800, 'Alitas'),
  ('Combo Familiar x 20', 59000, 'Alitas'),
  ('Combo Familiar x 30', 79000, 'Alitas'),
  ('Combo Familiar x 40', 89000, 'Alitas'),
  ('Combo Familiar x 50', 112000, 'Alitas'),

  -- AREPAS
  ('Arepa Paisa', 15000, 'Arepas'),
  ('Arepa Burguer', 15500, 'Arepas'),
  ('Arepa Pollo', 16000, 'Arepas'),
  ('Arepa Especial', 17000, 'Arepas'),

  -- SANDWICHES
  ('Sándwich Jamón y Queso', 12500, 'Sandwiches'),
  ('Sándwich Vegetariano', 12500, 'Sandwiches'),
  ('Sándwich Pollo', 15500, 'Sandwiches'),
  ('Sándwich Ranchero', 17000, 'Sandwiches'),
  ('Sándwich Especial', 19000, 'Sandwiches'),
  ('Adicional papas a la francesa', 5000, 'Sandwiches'),

  -- ASADOS
  ('Pollo a la Plancha', 27000, 'Asados'),
  ('Costillas BBQ', 27500, 'Asados'),
  ('Asada de Res', 29000, 'Asados'),
  ('Milanesa de Cerdo Apanada', 26000, 'Asados'),
  ('Chicharrón', 20000, 'Asados'),
  ('Picada Personal', 25000, 'Asados'),
  ('Picada x 2', 43500, 'Asados'),

  -- PARA PICAR
  ('Salchipapa Sencilla', 10500, 'Para picar'),
  ('Nuggets', 12500, 'Para picar'),
  ('Papas Vegetarianas', 15000, 'Para picar'),
  ('Suiza', 18500, 'Para picar'),
  ('Chorizo x 2', 19000, 'Para picar'),
  ('Salchipapa Especial', 23500, 'Para picar'),
  ('Chuzo Desgranado', 23000, 'Para picar'),

  -- HAMBURGUESAS
  ('Clasic Burguer', 17500, 'Hamburguesas'),
  ('Clasic Pollo', 20500, 'Hamburguesas'),
  ('Shak''s Burguer', 21500, 'Hamburguesas'),
  ('Dulce Montaña', 24000, 'Hamburguesas'),
  ('Shak''s Burguer Especial', 26500, 'Hamburguesas'),

  -- CREPES Y PATACONES
  ('Crepe de Pollo', 18500, 'Crepes y patacones'),
  ('Crepe Paisa', 19000, 'Crepes y patacones'),
  ('Crepe Especial', 22000, 'Crepes y patacones'),
  ('Patacón Pollo', 22000, 'Crepes y patacones'),
  ('Patacón Paisa', 22500, 'Crepes y patacones'),
  ('Patacón Especial', 25500, 'Crepes y patacones'),

  -- BEBIDAS REFRESCANTES
  ('Limonada Natural', 6000, 'Bebidas refrescantes'),
  ('Limonada Cherry', 8500, 'Bebidas refrescantes'),
  ('Limonada Hierbabuena', 8500, 'Bebidas refrescantes'),
  ('Limonada Mango Biche', 8500, 'Bebidas refrescantes'),
  ('Limonada de Coco', 9500, 'Bebidas refrescantes'),
  ('Limonada de Piña', 9500, 'Bebidas refrescantes'),
  ('Limonada Frutos Rojos', 9500, 'Bebidas refrescantes'),
  ('Gin Lemon', 8500, 'Bebidas refrescantes'),
  ('Toronja Limón', 8500, 'Bebidas refrescantes'),
  ('Tamarindo', 7500, 'Bebidas refrescantes'),
  ('Té Chai Frappe', 9500, 'Bebidas refrescantes'),
  ('Soda Michelada', 7500, 'Bebidas refrescantes'),
  ('Soda Saborizada Bubols', 11000, 'Bebidas refrescantes'),
  ('Soda Saborizada', 7000, 'Bebidas refrescantes'),
  ('Hit 350 ml', 4500, 'Bebidas refrescantes'),
  ('Hit 400 ml', 5000, 'Bebidas refrescantes'),
  ('Coca-Cola', 5000, 'Bebidas refrescantes'),
  ('Hit Litro', 7500, 'Bebidas refrescantes'),
  ('Gaseosa 1.5 L', 8000, 'Bebidas refrescantes'),
  ('Cerveza Nacional', 7500, 'Bebidas refrescantes'),
  ('Cerveza Corona', 9500, 'Bebidas refrescantes'),

  -- CAFÉ, JUGOS Y MALTEADAS
  ('Café', 3000, 'Café, jugos y malteadas'),
  ('Aromática', 3000, 'Café, jugos y malteadas'),
  ('Café en Leche', 5000, 'Café, jugos y malteadas'),
  ('Milo Caliente', 7500, 'Café, jugos y malteadas'),
  ('Milo Frío', 8500, 'Café, jugos y malteadas'),
  ('Aromática Frutos Deshidratados', 7500, 'Café, jugos y malteadas'),
  ('Té Chaí', 9000, 'Café, jugos y malteadas'),
  ('Malteada de Café', 11000, 'Café, jugos y malteadas'),
  ('Malteada de Vainilla', 11000, 'Café, jugos y malteadas'),
  ('Malteada de Oreo', 11000, 'Café, jugos y malteadas'),
  ('Malteada de Chocolate', 11000, 'Café, jugos y malteadas'),
  ('Jugo en Agua Guanábana', 7000, 'Café, jugos y malteadas'),
  ('Jugo en Agua Maracuyá', 7000, 'Café, jugos y malteadas'),
  ('Jugo en Agua Mango', 7000, 'Café, jugos y malteadas'),
  ('Jugo en Agua Fresa', 7000, 'Café, jugos y malteadas'),
  ('Jugo en Agua Mora', 7000, 'Café, jugos y malteadas'),
  ('Jugo en Leche Guanábana', 8500, 'Café, jugos y malteadas'),
  ('Jugo en Leche Maracuyá', 8500, 'Café, jugos y malteadas'),
  ('Jugo en Leche Mango', 8500, 'Café, jugos y malteadas'),
  ('Jugo en Leche Fresa', 8500, 'Café, jugos y malteadas'),
  ('Jugo en Leche Mora', 8500, 'Café, jugos y malteadas'),
  ('Jugo en Leche Maracumango', 8500, 'Café, jugos y malteadas'),

  -- BEBIDAS CON ALCOHOL
  ('Cerveza Envenenada Ginebra', 15000, 'Bebidas con alcohol'),
  ('Cerveza Envenenada Vodka', 15000, 'Bebidas con alcohol'),
  ('Cerveza Envenenada Tequila', 15000, 'Bebidas con alcohol'),
  ('Cerveza Envenenada Whiskey', 15000, 'Bebidas con alcohol'),
  ('Margarita', 19000, 'Bebidas con alcohol'),
  ('Gin Tonic', 19000, 'Bebidas con alcohol'),
  ('Sex on the Beach', 19000, 'Bebidas con alcohol'),
  ('Iris', 19000, 'Bebidas con alcohol'),
  ('Piña Colada', 19000, 'Bebidas con alcohol'),
  ('Orgasmo', 19000, 'Bebidas con alcohol'),
  ('Pantera Rosa', 19000, 'Bebidas con alcohol'),
  ('Tinto de Verano', 15500, 'Bebidas con alcohol'),
  ('Pecera x 2', 40000, 'Bebidas con alcohol'),
  ('Pecera x 4', 63000, 'Bebidas con alcohol');

commit;
