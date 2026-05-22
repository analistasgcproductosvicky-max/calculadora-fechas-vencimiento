/* =============================================
   CARGA DEL CSV
============================================= */
let productos = [];

fetch("productos.csv")
  .then(r => {
    if (!r.ok) throw new Error("No se pudo cargar productos.csv");
    return r.text();
  })
  .then(data => {
    productos = parsearCSV(data);
    mostrarFechaHoy();
  })
  .catch(err => console.error("Error cargando CSV:", err));

/* =============================================
   PARSE CSV  (soporta coma y punto y coma)
============================================= */
function parsearCSV(raw) {
  const filas = raw.trim().split("\n");
  const primeraLinea = filas[0].replace(/^\uFEFF/, '');
  const separador = primeraLinea.includes(";") ? ";" : ",";
  const headers = splitCSVLine(primeraLinea, separador);
  const result = [];
  for (let i = 1; i < filas.length; i++) {
    if (!filas[i].trim()) continue;
    const valores = splitCSVLine(filas[i], separador);
    let obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (valores[idx] || '').trim();
    });
    result.push(obj);
  }
  return result;
}

function splitCSVLine(line, sep) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === sep && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

/* =============================================
   FECHA HOY + SEMANA ISO + DÍA JULIANO
============================================= */
function mostrarFechaHoy() {
  const hoy = new Date();
  document.getElementById("fechaHoy").textContent = formatearFecha(hoy);

  // Semana ISO 8601
  const fecha = new Date(hoy.getTime());
  fecha.setHours(0, 0, 0, 0);
  fecha.setDate(fecha.getDate() + 3 - (fecha.getDay() + 6) % 7);
  const semanaBase = new Date(fecha.getFullYear(), 0, 4);
  const semana = 1 + Math.round(((fecha - semanaBase) / 86400000 - 3 + (semanaBase.getDay() + 6) % 7) / 7);
  document.getElementById("semanaAnio").textContent = semana;

  // Día juliano
  const diff = hoy - new Date(hoy.getFullYear(), 0, 0);
  document.getElementById("diaJuliano").textContent = Math.floor(diff / 86400000);
}

/* =============================================
   BÚSQUEDA GLOBAL POR PRODUCTO
============================================= */
function filtrarGlobal() {
  const query = document.getElementById("busquedaGlobalInput").value.trim();
  document.getElementById("globalWrap").classList.toggle("has-value", query.length > 0);

  if (!query) {
    cerrarDropdownGlobal();
    document.getElementById("globalResultado").style.display = "none";
    return;
  }

  const terminos = query.toLowerCase().split(/\s+/).filter(Boolean);
  const coincidencias = productos.filter(p =>
    terminos.every(t => p.Descripción.toLowerCase().includes(t))
  );

  renderDropdownGlobal(coincidencias, query);
}

function mostrarDropdownGlobal() {
  const query = document.getElementById("busquedaGlobalInput").value.trim();
  if (!query) return;
  filtrarGlobal();
}

function renderDropdownGlobal(lista, query) {
  const dd = document.getElementById("globalDropdown");

  if (!lista.length) {
    dd.innerHTML = '<div class="ac-empty">Sin coincidencias</div>';
    dd.classList.add("open");
    return;
  }

  // Agrupar por descripción única
  const unicas = [...new Map(lista.map(p => [p.Descripción.trim(), p])).values()];

  dd.innerHTML = unicas.slice(0, 30).map(p =>
    `<div class="ac-item" data-desc="${escaparAttr(p.Descripción.trim())}" onmousedown="seleccionarGlobal(this)">
      <span style="color:var(--muted);font-size:11px;">${p.Cliente}</span><br>
      ${resaltar(p.Descripción.trim(), query)}
    </div>`
  ).join("");
  dd.classList.add("open");
}

function seleccionarGlobal(el) {
  const desc = el.dataset.desc;
  document.getElementById("busquedaGlobalInput").value = desc;
  document.getElementById("globalWrap").classList.add("has-value");
  cerrarDropdownGlobal();
  mostrarTablaGlobal(desc);
}

function mostrarTablaGlobal(desc) {
  const filas = productos.filter(p => p.Descripción.trim() === desc);
  const tbody = document.getElementById("tablaGlobalBody");

  tbody.innerHTML = filas.map(p => `
    <tr>
      <td>${p.Cliente}</td>
      <td>${p.Descripción.trim()}</td>
      <td>${p["Vida Útil"]} ${p.UNM}</td>
      <td>${p["Inicio Vida Útil"]}</td>
      <td>${p.Embalaje}</td>
    </tr>
  `).join("");

  const res = document.getElementById("globalResultado");
  res.style.display = "block";

  let contador = res.querySelector(".tabla-contador");
  if (!contador) {
    contador = document.createElement("p");
    contador.className = "tabla-contador";
    res.insertBefore(contador, res.firstChild);
  }
  contador.textContent = `${filas.length} embalaje${filas.length !== 1 ? "s" : ""} encontrado${filas.length !== 1 ? "s" : ""}`;
}

function limpiarGlobal() {
  document.getElementById("busquedaGlobalInput").value = "";
  document.getElementById("globalWrap").classList.remove("has-value");
  document.getElementById("globalResultado").style.display = "none";
  cerrarDropdownGlobal();
}

function cerrarDropdownGlobal() {
  const dd = document.getElementById("globalDropdown");
  dd.classList.remove("open");
  dd.innerHTML = "";
}

// Cerrar al hacer clic fuera
document.addEventListener("click", function(e) {
  if (!document.getElementById("globalWrap")?.contains(e.target)) {
    cerrarDropdownGlobal();
  }
});

/* =============================================
   UTILIDADES
============================================= */
function resaltar(texto, query) {
  if (!query) return texto;
  const terminos = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let result = texto;
  terminos.forEach(t => {
    const re = new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    result = result.replace(re, '<mark>$1</mark>');
  });
  return result;
}

function escaparAttr(str) {
  return str.replace(/"/g, '&quot;');
}

function formatearFecha(f) {
  return (
    String(f.getDate()).padStart(2, "0") + "/" +
    String(f.getMonth() + 1).padStart(2, "0") + "/" +
    f.getFullYear()
  );
}

function sacudir(el) {
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "sacudida .4s ease";
  setTimeout(() => (el.style.animation = ""), 420);
}
