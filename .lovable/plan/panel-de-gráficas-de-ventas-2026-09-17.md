# Panel de gráficas de ventas

## Objetivo
Ampliar la pantalla de Métricas (vista administrativa) con un panel visual que permita consultar ventas de hoy y del mes.

## Cambios
- Añadir un selector táctil con las opciones **Hoy** y **Este Mes**.
- Mostrar en **Hoy** una gráfica de barras con ventas por hora en pesos colombianos.
- Mostrar en **Este Mes** una gráfica de línea con ventas acumuladas por día.
- Incluir datos de ejemplo realistas y resúmenes que cambien con el periodo seleccionado.
- Mantener la tabla de pedidos entregados y adaptar el panel a tabletas y computadores.

## Diseño
- Conservar la identidad visual actual de Shaks: rojo principal, amarillo/dorado, blanco y crema.
- Usar controles grandes, etiquetas claras y valores formateados en COP.
- Mantener una composición limpia y fácil de leer sin añadir nuevas pantallas.

## Detalles técnicos
- Usar la librería de gráficas que ya está instalada en el proyecto.
- Integrar el panel directamente en la pantalla de Métricas, sin modificar el flujo de Caja o Cocina.
- Verificar la compilación y el resultado visual en tamaños de tableta y computador.
