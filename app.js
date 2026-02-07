let productos = [];

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
  })
  .catch(error => console.error("Error cargando CSV:", error));

/* =======================
   FECHA DE HOY
======================= */
function mostrarFechaHoy() {
  const hoy = new Date();
  document.getElementById("fechaHoy").innerText = formatearFecha(hoy);
}

/* =======================
   CARGA CLIENTES
======================= */
function cargarClientes() {
  const select = document.getElementById("clienteFiltro");
  const clientesUnicos = [...new Set(productos.map(p => p["Cliente"]))];

  clientesUnicos.forEach(cliente => {
    const option = document.createElement("option");
    option.value = cliente;
    option.textContent = cliente;
    select.appendChild(option);
  });
}

/* =======================
   FILTRAR REFERENCIAS
======================= */
function filtrarReferencias() {
  const clienteSel = document.getElementById("clienteFiltro").value;
  const selectRef = document.getElementById("referencia");

  selectRef.innerHTML = '<option value="">Seleccione una referencia</option>';

  productos
    .filter(p => p["Cliente"] === clienteSel)
    .forEach(p => {
      const option = document.createElement("option");
      option.value = p["Descripción"];
      option.textContent = p["Descripción"];
      selectRef.appendChild(option);
    });
}

/* =======================
   BUSCAR PRODUCTO
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

  const cliente = prod["Cliente"].toLowerCase();

  if (cliente === "exito" || cliente === "éxito") {
    document.getElementById("bloqueProduccion").style.display = "block";
    document.getElementById("vencimiento").innerText = "";
  } else {
    document.getElementById("bloqueProduccion").style.display = "none";
    const fecha = calcularVencimientoNormal(prod);
    document.getElementById("vencimiento").innerText = formatearFecha(fecha);
  }
}

/* =======================
   ÉXITO → +149 DÍAS
======================= */
function calcularVencimientoExito() {
  const fechaProd = document.getElementById("fechaProduccion").value;
  if (!fechaProd) return;

  const partes = fechaProd.split("-");
  let fecha = new Date(partes[0], partes[1] - 1, partes[2]);
  fecha.setDate(fecha.getDate() + 149);

  document.getElementById("vencimiento").innerText = formatearFecha(fecha);
}

/* =======================
   CLIENTES NORMALES
======================= */
function calcularVencimientoNormal(prod) {
  const vida = parseInt(prod["Vida Útil"]);
  const unidad = prod["UNM"].toLowerCase();
  let fecha;
  const hoy = new Date();

  if (unidad.includes("mes")) {
    if (hoy.getDate() >= 25) {
      fecha = new Date(hoy.getFullYear(), hoy.getMonth(), 25);
    } else {
      fecha = new Date(hoy.getFullYear(), hoy.getMonth() - 1, 25);
    }
    fecha.setMonth(fecha.getMonth() + vida);
  } else if (unidad.includes("día")) {
    fecha = new Date();
    fecha.setDate(fecha.getDate() + vida);
  }

  return fecha;
}

/* =======================
   FORMATO DD/MM/AAAA
======================= */
function formatearFecha(fecha) {
  const dd = String(fecha.getDate()).padStart(2, "0");
  const mm = String(fecha.getMonth() + 1).padStart(2, "0");
  const yyyy = fecha.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}


