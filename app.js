/* =============================================
   CARGA DEL CSV
============================================= */
let productos = [];
let opcionesCliente = []; // referencias del cliente activo
let itemActivo = -1;      // índice del item resaltado con teclado

fetch("productos.csv")
  .then(r => {
    if (!r.ok) throw new Error("No se pudo cargar productos.csv");
    return r.text();
  })
  .then(data => {
    productos = parsearCSV(data);
    mostrarFechaHoy();
    cargarClientes();
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

// Parser CSV que respeta campos entre comillas
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
   FECHA HOY
============================================= */
function mostrarFechaHoy() {
  const hoy = new Date();
  document.getElementById("fechaHoy").textContent = formatearFecha(hoy);

  // Semana del año (ISO)
  const inicio = new Date(hoy.getFullYear(), 0, 1);
  const semana = Math.ceil(((hoy - inicio) / 86400000 + inicio.getDay() + 1) / 7);
  document.getElementById("semanaAnio").textContent = semana;

  // Día juliano (día del año)
  const diff = hoy - new Date(hoy.getFullYear(), 0, 0);
  document.getElementById("diaJuliano").textContent = Math.floor(diff / 86400000);
}

/* =============================================
   CLIENTES
============================================= */
function cargarClientes() {
  const sel = document.getElementById("clienteFiltro");
  [...new Set(productos.map(p => p.Cliente))].sort().forEach(c => {
    const o = document.createElement("option");
    o.value = c; o.textContent = c;
    sel.appendChild(o);
  });
}

/* =============================================
   REFERENCIAS — poblar lista del cliente
============================================= */
function filtrarReferencias() {
  const cliente = document.getElementById("clienteFiltro").value;
  const input = document.getElementById("referenciaInput");
  const hidden = document.getElementById("referencia");

  // Reiniciar autocomplete
  input.value = "";
  input.disabled = !cliente;
  input.placeholder = cliente ? "Escriba para buscar…" : "Seleccione primero un cliente…";
  hidden.value = "";
  document.getElementById("autocompleteWrap").classList.remove("has-value");
  cerrarDropdown();
  ocultarResultado();

  if (!cliente) { opcionesCliente = []; return; }

  opcionesCliente = [...new Set(
    productos.filter(p => p.Cliente === cliente).map(p => p.Descripción.trim())
  )];
}

/* =============================================
   AUTOCOMPLETE — filtrar mientras escribe
============================================= */
function filtrarOpciones() {
  const query = document.getElementById("referenciaInput").value.trim();
  const hidden = document.getElementById("referencia");
  const wrap = document.getElementById("autocompleteWrap");

  // Si el texto ya no coincide con la selección guardada, limpiar hidden
  if (hidden.value && hidden.value !== query) {
    hidden.value = "";
  }

  wrap.classList.toggle("has-value", query.length > 0);
  itemActivo = -1;

  if (!query) {
    cerrarDropdown();
    return;
  }

  const terminos = query.toLowerCase().split(/\s+/).filter(Boolean);
  const coincidencias = opcionesCliente.filter(op =>
    terminos.every(t => op.toLowerCase().includes(t))
  );

  renderDropdown(coincidencias, query);
}

function mostrarDropdown() {
  const query = document.getElementById("referenciaInput").value.trim();
  if (!query && opcionesCliente.length) {
    renderDropdown(opcionesCliente, "");
  }
}

function renderDropdown(lista, query) {
  const dd = document.getElementById("autocompleteDropdown");

  if (!lista.length) {
    dd.innerHTML = '<div class="ac-empty">Sin coincidencias</div>';
    dd.classList.add("open");
    return;
  }

  dd.innerHTML = lista.map((op, i) =>
    `<div class="ac-item" data-val="${escaparAttr(op)}" onmousedown="seleccionarOpcion(this)">${resaltar(op, query)}</div>`
  ).join("");
  dd.classList.add("open");
}

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

function seleccionarOpcion(el) {
  const val = el.dataset.val;
  document.getElementById("referenciaInput").value = val;
  document.getElementById("referencia").value = val;
  document.getElementById("autocompleteWrap").classList.add("has-value");
  cerrarDropdown();
  itemActivo = -1;
}

function cerrarDropdown() {
  const dd = document.getElementById("autocompleteDropdown");
  dd.classList.remove("open");
  dd.innerHTML = "";
}

function limpiarReferencia() {
  document.getElementById("referenciaInput").value = "";
  document.getElementById("referencia").value = "";
  document.getElementById("autocompleteWrap").classList.remove("has-value");
  cerrarDropdown();
  ocultarResultado();
}

// Navegación con teclado (↑ ↓ Enter Escape)
document.addEventListener("keydown", function(e) {
  const dd = document.getElementById("autocompleteDropdown");
  if (!dd.classList.contains("open")) return;

  const items = dd.querySelectorAll(".ac-item");
  if (!items.length) return;

  if (e.key === "ArrowDown") {
    e.preventDefault();
    itemActivo = Math.min(itemActivo + 1, items.length - 1);
    actualizarActivo(items);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    itemActivo = Math.max(itemActivo - 1, 0);
    actualizarActivo(items);
  } else if (e.key === "Enter") {
    e.preventDefault();
    if (itemActivo >= 0) seleccionarOpcion(items[itemActivo]);
    else if (items.length === 1) seleccionarOpcion(items[0]);
  } else if (e.key === "Escape") {
    cerrarDropdown();
  }
});

// Cerrar al hacer clic fuera
document.addEventListener("click", function(e) {
  if (!document.getElementById("autocompleteWrap").contains(e.target)) {
    cerrarDropdown();
  }
});

function actualizarActivo(items) {
  items.forEach((el, i) => el.classList.toggle("active", i === itemActivo));
  if (itemActivo >= 0) items[itemActivo].scrollIntoView({ block: "nearest" });
}

/* =============================================
   BUSCAR
============================================= */
function buscar() {
  const refVal = document.getElementById("referencia").value ||
                 document.getElementById("referenciaInput").value.trim();

  if (!refVal) {
    sacudir(document.getElementById("referenciaInput"));
    return;
  }

  const coincidencias = productos.filter(p => p.Descripción.trim() === refVal.trim());
if (!coincidencias.length) { sacudir(document.getElementById("referenciaInput")); return; }
const prod = coincidencias[0];
  if (!prod) {
    sacudir(document.getElementById("referenciaInput"));
    return;
  }

  // Asegurar que hidden tenga el valor
  document.getElementById("referencia").value = prod.Descripción.trim();

  // Poblar datos
  document.getElementById("rCliente").textContent  = prod.Cliente;
  document.getElementById("rVida").textContent     = prod["Vida Útil"] + " " + prod.UNM;
  document.getElementById("rUnidad").textContent   = prod.UNM;
  document.getElementById("rInicio").textContent   = prod["Inicio Vida Útil"];
  const embalajes = coincidencias.map((p, i) => `${i + 1}. ${p.Embalaje}`).join("\n");
  document.getElementById("rEmbalaje").textContent = embalajes;


  mostrarCard("cardResultado");
  ocultarVencimiento();

  // Guardar fecha y vida antes de resetear los bloques
  const fechaGuardada = document.getElementById("fechaProduccion").value;
  const vidaGuardada  = vidaSeleccionadaVal;
  ocultarBloques();

  const cliente = prod.Cliente.toLowerCase();
  const inicio  = prod["Inicio Vida Útil"].toLowerCase();

  if (cliente.includes("exito") || cliente.includes("éxito")) {
    mostrarBloque("bloqueProduccion", "exito");
    _restaurarFechaYCalcular(fechaGuardada, null);
    return;
  }
  if (inicio.includes("producción")) {
    mostrarBloque("bloqueProduccion");
    const tieneVidaVar = prod["Vida Útil"].includes("12") && prod["Vida Útil"].includes("18");
    if (tieneVidaVar) {
      document.getElementById("bloqueVidaVariable").style.display = "block";
    }
    _restaurarFechaYCalcular(fechaGuardada, tieneVidaVar ? vidaGuardada : null);
    return;
  }
  if (inicio.includes("25"))    { mostrarVencimiento(calcularUltimo25(prod));   return; }
  if (inicio.includes("lunes")) { mostrarVencimiento(calcularUltimoLunes(prod)); }
}

// Restaura la fecha (y vida si aplica) y dispara el calculo si hay fecha
function _restaurarFechaYCalcular(fecha, vida) {
  if (!fecha) return;
  document.getElementById("fechaProduccion").value = fecha;
  if (vida) {
    vidaSeleccionadaVal = vida;
    document.querySelectorAll(".vida-btn").forEach(b => {
      b.classList.toggle("active", b.dataset.val === vida);
    });
  }
  calcularDesdeProduccion();
}

/* =============================================
   VIDA VARIABLE
============================================= */
let vidaSeleccionadaVal = null;

function selVida(btn) {
  document.querySelectorAll(".vida-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  vidaSeleccionadaVal = btn.dataset.val;
  // El calculo se dispara al presionar Consultar, no aqui
}

/* =============================================
   DESDE PRODUCCIÓN
============================================= */
function calcularDesdeProduccion() {
  const f = document.getElementById("fechaProduccion").value;
  if (!f) return;
  const bloqueProd = document.getElementById("bloqueProduccion");
  const modo = bloqueProd.dataset.modo || "";
  const [y, m, d] = f.split("-");
  let fecha = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));

  if (modo === "exito") {
    fecha.setDate(fecha.getDate() + 149);
    mostrarVencimiento(fecha);
    return;
  }
  const bloqueVida = document.getElementById("bloqueVidaVariable");
  if (bloqueVida.style.display !== "none") {
    if (!vidaSeleccionadaVal) return;
    fecha.setMonth(fecha.getMonth() + parseInt(vidaSeleccionadaVal));
  } else {
    const meses = extraerNumero(document.getElementById("rVida").textContent);
    if (!meses) return;
    fecha.setMonth(fecha.getMonth() + meses);
  }
  mostrarVencimiento(fecha);
}

/* =============================================
   REGLAS DE CÁLCULO
============================================= */
function calcularUltimo25(prod) {
  const meses = extraerNumero(prod["Vida Útil"]);
  const hoy = new Date();
  const base = hoy.getDate() >= 25
    ? new Date(hoy.getFullYear(), hoy.getMonth(), 25)
    : new Date(hoy.getFullYear(), hoy.getMonth() - 1, 25);
  base.setMonth(base.getMonth() + meses);
  return base;
}

function calcularUltimoLunes(prod) {
  const meses = extraerNumero(prod["Vida Útil"]);
  const hoy = new Date();
  const diasAtras = hoy.getDay() === 1 ? 0 : (hoy.getDay() + 6) % 7;
  let base = new Date(hoy);
  base.setDate(hoy.getDate() - diasAtras);
  base.setMonth(base.getMonth() + meses);
  return base;
}

/* =============================================
   UTILIDADES UI
============================================= */
function mostrarCard(id) {
  const el = document.getElementById(id);
  el.style.display = "block";
  el.style.animation = "none";
  void el.offsetWidth;
  el.style.animation = "fadeUp .35s ease both";
}

function mostrarBloque(id, modo) {
  const el = document.getElementById(id);
  el.style.display = "block";
  if (modo) el.dataset.modo = modo;
  else delete el.dataset.modo;
  document.getElementById("fechaProduccion").value = "";
}

function mostrarVencimiento(fecha) {
  document.getElementById("rVencimiento").textContent = formatearFecha(fecha);
  const blk = document.getElementById("vencBlock");
  blk.style.display = "flex";
  blk.style.animation = "none";
  void blk.offsetWidth;
  blk.style.animation = "fadeUp .3s ease both";
}

function ocultarVencimiento() {
  document.getElementById("vencBlock").style.display = "none";
  document.getElementById("rVencimiento").textContent = "—";
}

function ocultarBloques() {
  ["bloqueProduccion", "bloqueVidaVariable"].forEach(id => {
    const el = document.getElementById(id);
    el.style.display = "none";
    delete el.dataset.modo;
  });
  document.getElementById("fechaProduccion").value = "";
  vidaSeleccionadaVal = null;
  document.querySelectorAll(".vida-btn").forEach(b => b.classList.remove("active"));
}

function ocultarResultado() {
  document.getElementById("cardResultado").style.display = "none";
  ocultarBloques();
  ocultarVencimiento();
}

function nuevaBusqueda() {
  document.getElementById("clienteFiltro").value = "";
  limpiarReferencia();
  opcionesCliente = [];
  document.getElementById("referenciaInput").disabled = true;
  document.getElementById("referenciaInput").placeholder = "Seleccione primero un cliente…";
  ocultarResultado();
}

/* =============================================
   UTILIDADES DATOS
============================================= */
function extraerNumero(texto) {
  const n = String(texto).match(/\d+/);
  return n ? parseInt(n[0]) : 0;
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
