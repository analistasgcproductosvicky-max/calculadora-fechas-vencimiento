let productos = [];



/* =======================
   CARGA CSV
======================= */
.then(data => {
  const filas = data.trim().split("\n");
  const headers = filas[0].replace(/^\uFEFF/, '').split(";");

  for (let i = 1; i < filas.length; i++) {
    const valores = filas[i].split(";");
    let obj = {};
    headers.forEach((h, idx) => {
      obj[h.trim()] = valores[idx]?.trim();
    });
    productos.push(obj);
  }

  mostrarFechaHoy();
  cargarClientes();
});

/* =======================
   FECHA HOY
======================= */
function mostrarFechaHoy() {
  document.getElementById("fechaHoy").innerText = formatearFecha(new Date());
}

/* =======================
   CLIENTES
======================= */
function cargarClientes() {
  const select = document.getElementById("clienteFiltro");
  select.innerHTML = '<option value="">Seleccione un cliente</option>';

  [...new Set(productos.map(p => p.Cliente))].forEach(c => {
    const o = document.createElement("option");
    o.value = c;
    o.textContent = c;
    select.appendChild(o);
  });
}

/* =======================
   REFERENCIAS
======================= */
function filtrarReferencias() {
  const cliente = document.getElementById("clienteFiltro").value;
  const ref = document.getElementById("referencia");

  ref.innerHTML = '<option value="">Seleccione una referencia</option>';
  if (!cliente) return;

  productos
    .filter(p => p.Cliente === cliente)
    .forEach(p => {
      const o = document.createElement("option");
      o.value = p.Descripción;
      o.textContent = p.Descripción;
      ref.appendChild(o);
    });
}

/* =======================
   BUSCAR
======================= */
function buscar() {
  const refSel = document.getElementById("referencia").value;
  const prod = productos.find(
    p => p.Descripción.trim() === refSel.trim()
  );
  if (!prod) return;

  document.getElementById("cliente").innerText = prod.Cliente;
  document.getElementById("vida").innerText = prod["Vida Útil"];
  document.getElementById("unidad").innerText = prod.UNM;
  document.getElementById("inicio").innerText = prod["Inicio Vida Útil"];
  document.getElementById("embalaje").innerText = prod.Embalaje;
  document.getElementById("vencimiento").innerText = "";

  const bloqueProd = document.getElementById("bloqueProduccion");
  const bloqueVidaVar = document.getElementById("bloqueVidaVariable");

  bloqueProd.style.display = "none";
  bloqueVidaVar.style.display = "none";
  delete bloqueProd.dataset.modo;

  const cliente = prod.Cliente.toLowerCase();
  const inicio = prod["Inicio Vida Útil"].toLowerCase();

  // CASO ÉXITO → días fijos
  if (cliente.includes("exito") || cliente.includes("éxito")) {
    bloqueProd.style.display = "block";
    bloqueProd.dataset.modo = "exito";
    return;
  }

  // CASO PRODUCCIÓN → meses reales
  if (inicio.includes("producción")) {
    bloqueProd.style.display = "block";

    if (
      prod["Vida Útil"].includes("12") &&
      prod["Vida Útil"].includes("18")
    ) {
      bloqueVidaVar.style.display = "block";
    }
    return;
  }

  // CASO ÚLTIMO 25
  if (inicio.includes("25")) {
    const fecha = calcularUltimo25(prod);
    document.getElementById("vencimiento").innerText =
      formatearFecha(fecha);
    return;
  }

  // CASO ÚLTIMO LUNES
  if (inicio.includes("lunes")) {
    const fecha = calcularUltimoLunes(prod);
    document.getElementById("vencimiento").innerText =
      formatearFecha(fecha);
  }
}

/* =======================
   REGLA ÚLTIMO 25
======================= */
function calcularUltimo25(prod) {
  const meses = extraerMeses(prod["Vida Útil"]);
  const hoy = new Date();

  const base =
    hoy.getDate() >= 25
      ? new Date(hoy.getFullYear(), hoy.getMonth(), 25)
      : new Date(hoy.getFullYear(), hoy.getMonth() - 1, 25);

  base.setMonth(base.getMonth() + meses);
  return base;
}

/* =======================
   REGLA ÚLTIMO LUNES
======================= */
function calcularUltimoLunes(prod) {
  const meses = extraerMeses(prod["Vida Útil"]);
  const hoy = new Date();

  const diaSemana = hoy.getDay(); // 0=domingo, 1=lunes
  const diferencia = diaSemana === 1 ? 0 : (diaSemana + 6) % 7;

  let base = new Date(hoy);
  base.setDate(hoy.getDate() - diferencia);

  base.setMonth(base.getMonth() + meses);
  return base;
}

/* =======================
   DESDE PRODUCCIÓN
======================= */
function calcularDesdeProduccion() {
  const f = document.getElementById("fechaProduccion").value;
  if (!f) return;

  const bloqueProd = document.getElementById("bloqueProduccion");
  const modo = bloqueProd.dataset.modo || "";

  const [y, m, d] = f.split("-");
  let fecha = new Date(y, m - 1, d);

  // ÉXITO → +149 días (incluye día de producción)
  if (modo === "exito") {
    fecha.setDate(fecha.getDate() + 149);
    document.getElementById("vencimiento").innerText =
      formatearFecha(fecha);
    return;
  }

  let meses =
    document.getElementById("vidaSeleccionada")?.value ||
    extraerMeses(document.getElementById("vida").innerText);

  fecha.setMonth(fecha.getMonth() + parseInt(meses));
  document.getElementById("vencimiento").innerText =
    formatearFecha(fecha);
}

/* =======================
   UTILIDADES
======================= */
function extraerMeses(texto) {
  const numero = texto.match(/\d+/);
  if (!numero) {
    alert("Formato inválido en Vida Útil: " + texto);
    return 0;
  }
  return parseInt(numero[0]);
}

function formatearFecha(f) {
  return `${String(f.getDate()).padStart(2, "0")}/${String(
    f.getMonth() + 1
  ).padStart(2, "0")}/${f.getFullYear()}`;
}

/* =======================
   NUEVA BÚSQUEDA
======================= */
function nuevaBusqueda() {
  const cliente = document.getElementById("clienteFiltro");
  const ref = document.getElementById("referencia");

  cliente.value = "";
  ref.innerHTML = '<option value="">Seleccione una referencia</option>';
  ref.value = "";

  document.getElementById("fechaProduccion").value = "";
  document.getElementById("vidaSeleccionada").value = "";

  const bloqueProd = document.getElementById("bloqueProduccion");
  const bloqueVidaVar = document.getElementById("bloqueVidaVariable");

  bloqueProd.style.display = "none";
  bloqueVidaVar.style.display = "none";
  delete bloqueProd.dataset.modo;

  document.getElementById("cliente").textContent = "";
  document.getElementById("vida").textContent = "";
  document.getElementById("unidad").textContent = "";
  document.getElementById("inicio").textContent = "";
  document.getElementById("embalaje").textContent = "";
  document.getElementById("vencimiento").textContent = "";
}










