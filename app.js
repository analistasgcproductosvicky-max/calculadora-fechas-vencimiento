/* =============================================
   CARGA DEL CSV
   El CSV se sirve desde productos.csv en el
   mismo repositorio de GitHub Pages.
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
    cargarClientes();
  })
  .catch(err => {
    console.error("Error cargando CSV:", err);
    // Fallback: intentar desde productos.js si existe
    if (typeof PRODUCTOS_DATA !== "undefined") {
      productos = parsearCSV(PRODUCTOS_DATA);
      mostrarFechaHoy();
      cargarClientes();
    }
  });

/* =============================================
   PARSE CSV
============================================= */
function parsearCSV(raw) {
  const filas = raw.trim().split("\n");
  const headers = filas[0].replace(/^\uFEFF/, '').split(";");
  const result = [];
  for (let i = 1; i < filas.length; i++) {
    const valores = filas[i].split(";");
    let obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = (valores[idx] || '').trim();
    });
    result.push(obj);
  }
  return result;
}

/* =============================================
   FECHA HOY
============================================= */
function mostrarFechaHoy() {
  document.getElementById("fechaHoy").textContent = formatearFecha(new Date());
}

/* =============================================
   CLIENTES
============================================= */
function cargarClientes() {
  const sel = document.getElementById("clienteFiltro");
  [...new Set(productos.map(p => p.Cliente))].sort().forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  });
}

/* =============================================
   REFERENCIAS
============================================= */
function filtrarReferencias() {
  const cliente = document.getElementById("clienteFiltro").value;
  const ref = document.getElementById("referencia");

  ref.innerHTML = '<option value="">Seleccione una referencia…</option>';
  ref.disabled = !cliente;
  if (!cliente) { ocultarResultado(); return; }

  productos
    .filter(p => p.Cliente === cliente)
    .forEach(p => {
      const o = document.createElement("option");
      o.value = p.Descripción;
      o.textContent = p.Descripción;
      ref.appendChild(o);
    });

  ocultarResultado();
}

/* =============================================
   BUSCAR
============================================= */
function buscar() {
  const refSel = document.getElementById("referencia").value;
  if (!refSel) {
    sacudir(document.getElementById("referencia"));
    return;
  }

  const prod = productos.find(p => p.Descripción.trim() === refSel.trim());
  if (!prod) return;

  // Poblar datos básicos
  document.getElementById("rCliente").textContent  = prod.Cliente;
  document.getElementById("rVida").textContent     = prod["Vida Útil"] + " " + prod.UNM;
  document.getElementById("rUnidad").textContent   = prod.UNM;
  document.getElementById("rInicio").textContent   = prod["Inicio Vida Útil"];
  document.getElementById("rEmbalaje").textContent = prod.Embalaje;

  // Mostrar card resultado
  mostrarCard("cardResultado");
  ocultarVencimiento();
  ocultarBloques();

  const cliente = prod.Cliente.toLowerCase();
  const inicio  = prod["Inicio Vida Útil"].toLowerCase();

  // ── ÉXITO → +149 días desde producción ──
  if (cliente.includes("exito") || cliente.includes("éxito")) {
    mostrarBloque("bloqueProduccion", "exito");
    return;
  }

  // ── DESDE PRODUCCIÓN (meses) ──
  if (inicio.includes("producción")) {
    mostrarBloque("bloqueProduccion");
    // Vida variable 12 o 18
    if (prod["Vida Útil"].includes("12") && prod["Vida Útil"].includes("18")) {
      document.getElementById("bloqueVidaVariable").style.display = "block";
    }
    return;
  }

  // ── ÚLTIMO 25 ──
  if (inicio.includes("25")) {
    mostrarVencimiento(calcularUltimo25(prod));
    return;
  }

  // ── ÚLTIMO LUNES ──
  if (inicio.includes("lunes")) {
    mostrarVencimiento(calcularUltimoLunes(prod));
  }
}

/* =============================================
   VIDA VARIABLE — botones toggle
============================================= */
let vidaSeleccionadaVal = null;

function selVida(btn) {
  document.querySelectorAll(".vida-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  vidaSeleccionadaVal = btn.dataset.val;
  calcularDesdeProduccion();
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

  // Éxito: +149 días (día de producción + 149)
  if (modo === "exito") {
    fecha.setDate(fecha.getDate() + 149);
    mostrarVencimiento(fecha);
    return;
  }

  // Vida variable
  const bloqueVida = document.getElementById("bloqueVidaVariable");
  if (bloqueVida.style.display !== "none") {
    if (!vidaSeleccionadaVal) return; // esperar selección
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
  const ref = document.getElementById("referencia");
  ref.innerHTML = '<option value="">Seleccione primero un cliente…</option>';
  ref.disabled = true;
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
