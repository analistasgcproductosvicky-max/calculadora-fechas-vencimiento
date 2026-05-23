/* =============================================
   CARGA DEL CSV
============================================= */
let productos = [];
let productoActual = null; // producto seleccionado actualmente
let vidaSeleccionadaVal = null;

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
   PARSE CSV
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
   BÚSQUEDA GLOBAL
============================================= */
function filtrarGlobal() {
  const query = document.getElementById("busquedaGlobalInput").value.trim();
  document.getElementById("globalWrap").classList.toggle("has-value", query.length > 0);

  if (!query) {
    cerrarDropdownGlobal();
    ocultarTodo();
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

  // Guardar el primer producto como referencia para el cálculo
  productoActual = productos.find(p => p.Descripción.trim() === desc);

  mostrarTablaGlobal(desc);
  mostrarObservaciones(desc);
  aplicarReglasVencimiento(productoActual);
}

/* =============================================
   TABLA DE EMBALAJES
============================================= */
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

/* =============================================
   REGLAS DE VENCIMIENTO
============================================= */
function aplicarReglasVencimiento(prod) {
  ocultarBloques();
  ocultarVencimiento();

  const cliente = prod.Cliente.toLowerCase();
  const inicio  = prod["Inicio Vida Útil"].toLowerCase();

  // ÉXITO → fecha de producción + 149 días
  if (cliente.includes("exito") || cliente.includes("éxito")) {
    mostrarBloque("bloqueProduccion", "exito");
    mostrarBloque("bloqueBoton");
    return;
  }

  // DESDE PRODUCCIÓN (meses)
  if (inicio.includes("producción")) {
    mostrarBloque("bloqueProduccion");
    mostrarBloque("bloqueBoton");
    const tieneVidaVar = prod["Vida Útil"].includes("12") && prod["Vida Útil"].includes("18");
    if (tieneVidaVar) mostrarBloque("bloqueVidaVariable");
    return;
  }

  // ÚLTIMO 25 → cálculo automático
  if (inicio.includes("25")) {
    mostrarVencimiento(calcularUltimo25(prod));
    return;
  }

  // ÚLTIMO LUNES → cálculo automático
  if (inicio.includes("lunes")) {
    mostrarVencimiento(calcularUltimoLunes(prod));
  }
}

/* =============================================
   CÁLCULOS
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

function calcularDesdeProduccion() {
  const f = document.getElementById("fechaProduccion").value;
  if (!f || !productoActual) return;

  const bloqueProd = document.getElementById("bloqueProduccion");
  const modo = bloqueProd.dataset.modo || "";
  const [y, m, d] = f.split("-");
  let fecha = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));

  // Éxito: +149 días
  if (modo === "exito") {
    fecha.setDate(fecha.getDate() + 149);
    mostrarVencimiento(fecha);
    return;
  }

  // Vida variable
  const bloqueVida = document.getElementById("bloqueVidaVariable");
  if (bloqueVida.style.display !== "none") {
    if (!vidaSeleccionadaVal) { sacudir(bloqueVida); return; }
    fecha.setMonth(fecha.getMonth() + parseInt(vidaSeleccionadaVal));
  } else {
    const meses = extraerNumero(productoActual["Vida Útil"]);
    if (!meses) return;
    fecha.setMonth(fecha.getMonth() + meses);
  }

  mostrarVencimiento(fecha);
}

function selVida(btn) {
  document.querySelectorAll(".vida-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  vidaSeleccionadaVal = btn.dataset.val;
}

/* =============================================
   UTILIDADES UI
============================================= */
function mostrarObservaciones(desc) {
  const filas = productos.filter(p => p.Descripción.trim() === desc);
  
  // Buscar la primera fila que tenga observación
  const conObs = filas.find(p => {
    const obs = p["Observaciones"] || p["observaciones"] || "";
    return obs.trim() !== "";
  });

  const bloque = document.getElementById("bloqueObservaciones");
  const texto  = document.getElementById("obsTexto");

  if (conObs) {
    const obs = conObs["Observaciones"] || conObs["observaciones"] || "";
    texto.textContent = obs.trim();
    bloque.style.display = "block";
  } else {
    bloque.style.display = "none";
  }
}

function mostrarBloque(id, modo) {
  const el = document.getElementById(id);
  el.style.display = "block";
  if (modo) el.dataset.modo = modo;
  else delete el.dataset.modo;
}

function ocultarBloques() {
  ["bloqueProduccion", "bloqueVidaVariable", "bloqueBoton", "bloqueObservaciones"].forEach(id => {
    const el = document.getElementById(id);
    el.style.display = "none";
    delete el.dataset.modo;
  });
  document.getElementById("fechaProduccion").value = "";
  vidaSeleccionadaVal = null;
  document.querySelectorAll(".vida-btn").forEach(b => b.classList.remove("active"));
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

function ocultarTodo() {
  document.getElementById("globalResultado").style.display = "none";
  ocultarBloques();
  ocultarVencimiento();
  productoActual = null;
}

function limpiarGlobal() {
  document.getElementById("busquedaGlobalInput").value = "";
  document.getElementById("globalWrap").classList.remove("has-value");
  cerrarDropdownGlobal();
  ocultarTodo();
}

function cerrarDropdownGlobal() {
  const dd = document.getElementById("globalDropdown");
  dd.classList.remove("open");
  dd.innerHTML = "";
}

document.addEventListener("click", function(e) {
  if (!document.getElementById("globalWrap")?.contains(e.target)) {
    cerrarDropdownGlobal();
  }
});

/* =============================================
   UTILIDADES DATOS
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
