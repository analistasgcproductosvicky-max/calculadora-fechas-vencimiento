# Consulta de Vida Útil — Pasabocas La Victoria

Módulo interno para calcular la fecha de vencimiento de productos según las reglas de cada cliente.

## Archivos

| Archivo | Descripción |
|---|---|
| `index.html` | Estructura HTML de la aplicación |
| `style.css` | Estilos — paleta corporativa La Victoria |
| `app.js` | Lógica de cálculo y control de UI |
| `productos.csv` | Base de datos de productos (editable) |
| `AJUSTADA.png` | Logo La Victoria / Vicky |

## Publicar en GitHub Pages

1. Subir todos los archivos al repositorio
2. Ir a **Settings → Pages**
3. En *Source* seleccionar `main` / `root`
4. La URL quedará: `https://<usuario>.github.io/<repositorio>/`

## Actualizar productos

Solo editar `productos.csv` — sin tocar código.  
El separador de columnas es `;` (punto y coma).

## Reglas de cálculo implementadas

| Regla | Descripción |
|---|---|
| **Último 25** | Fecha base = día 25 del mes actual (si hoy ≥ 25) o mes anterior. Se suman los meses de vida útil. |
| **Último lunes** | Fecha base = lunes más reciente. Se suman los meses de vida útil. |
| **Fecha de producción** | Usuario ingresa fecha; se suman los meses (o 149 días para Éxito). |
| **Vida variable (N₂)** | El usuario elige entre 12 o 18 meses antes de calcular. |
