let productos = [];

/* =======================
   CARGA CSV
======================= */
fetch("productos.csv")
  .then(response => response.text())
  .then(data => {
    const filas = data.trim().split("\n");
    const encabezados = filas[0].split(";");

    for (let i = 1; i < filas.length; i++) {
      const valores = filas[i].split(";");
      let obj = {};
      encabezados.forEach((h, index) => {
        obj[h.trim()] = valores[index]?.trim();
      });
      productos.push(obj);
    }

    mostrarFechaHoy();
    cargarClientes();
  });

/* =======================
   FECHA DE HOY
======================= */
function mostrarFechaHoy() {
  const hoy = new Date();
  document.getElementById("fechaHoy").innerText = formatearFecha(hoy);
}

/* =======================
   CLIENTES
======================= */
function cargarClientes() {
  const select = document.getElementById("clienteFiltro");
  select.innerHTML = '<option value="">Seleccione un cliente</option>';

  [...new Set(productos.map(p => p["Cliente"]))].forEach(c => {
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

  productos
    .filter(p => p["Cliente"] === cliente)
    .forEach(p => {
      const o = document.createElement("option");
      o.value = p["Descripción"];
      o.textContent = p["Descripción"];
      ref.appendChild(o);
    });
}

/* =======================
   BUSCAR
======================= */
function buscar() {
  const ref = document.getElementById("referencia").value;
  const prod = productos.find(p => p["Descripción"] === ref);
  if (!prod) return;

  document.getElementById("cliente").innerText = prod["Cliente"];
  document.getElementById("vida").innerText = prod["Vida Útil"];
  document.getElementById("unidad").innerText = prod["UNM"];
  document.getElementById("inicio").innerText = prod["Inicio Vida Útil"];
  document.getElementById("embalaje").innerText = prod["Embalaje"];
  document.getElementById("vencimiento").innerText = "";

  document.getElementById("bloqueProduccion").style.display = "none";
  document.getElementById("bloqueVidaVariable").style.display = "none";

  const cliente = prod["Cliente"].toLowerCase();
  const inicio = prod["Inicio Vida Útil"].toLowerCase();

  // CASO ÉXITO (149 días)
  if (cliente.includes("exito") || cliente.includes("éxito")) {
    document.getElementById("bloqueProduccion").style.display = "block";
    document.getElementById("bloqueProduccion").dataset.modo = "exito";
    return;
  }

  // CASO FECHA DE PRODUCCIÓN (MESES)
  if (inicio.includes("producción")) {
    document.getElementById("bloqueProduccion").style.display = "block";

    if (prod["Vida Útil"].includes("12") && prod["Vida Útil"].includes("18")) {
      document.getElementById("bloqueVidaVariable").style.display = "block";
    }
    return;
  }

  // CASO ÚLTIMO 25
  if (inicio.includes("25")) {
    const fecha = calcularUltimo25(prod);
    document.getElementById("vencimiento").innerText = formatearFecha(fecha);
  }
}


/* =======================
   ÚLTIMO 25
======================= */
function calcularUltimo25(prod) {
  const vida = parseInt(prod["Vida Útil"]);
  const hoy = new Date();

  let base =
    hoy.getDate() >= 25
      ? new Date(hoy.getFullYear(), hoy.getMonth(), 25)
      : new Date(hoy.getFullYear(), hoy.getMonth() - 1, 25);

  base.setMonth(base.getMonth() + vida);
  return base;
}

/* =======================
   DESDE PRODUCCIÓN
======================= */
function calcularDesdeProduccion() {
  const f = document.getElementById("fechaProduccion").value;
  if (!f) return;

  const modo = document.getElementById("bloqueProduccion").dataset.modo || "";
  const [y, m, d] = f.split("-");
  let fecha = new Date(y, m - 1, d);

  // ÉXITO → +149 días (día de producción cuenta)
  if (modo === "exito") {
    fecha.setDate(fecha.getDate() + 149);
    document.getElementById("vencimiento").innerText = formatearFecha(fecha);
    return;
  }

  // PRODUCCIÓN NORMAL → meses
  let meses = document.getElementById("vidaSeleccionada")?.value;
  if (!meses) meses = document.getElementById("vida").innerText;

  fecha.setMonth(fecha.getMonth() + parseInt(meses));
  document.getElementById("vencimiento").innerText = formatearFecha(fecha);
}

/* =======================
   FORMATO FECHA
======================= */
function formatearFecha(f) {
  return `${String(f.getDate()).padStart(2, "0")}/${String(
    f.getMonth() + 1
  ).padStart(2, "0")}/${f.getFullYear()}`;
}







