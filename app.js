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

    cargarReferencias();
  })
  .catch(error => console.error("Error cargando CSV:", error));

function cargarReferencias() {
  const select = document.getElementById("referencia");

  productos.forEach(p => {
    const option = document.createElement("option");
    option.value = p["Descripción"];
    option.textContent = p["Descripción"];
    select.appendChild(option);
  });
}

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
    document.getElementById("vencimiento").innerText =
      calcularVencimientoNormal(prod);
  }
}

function calcularVencimientoExito() {
  const fechaProd = document.getElementById("fechaProduccion").value;
  if (!fechaProd) return;

  let fecha = new Date(fechaProd);
  fecha.setDate(fecha.getDate() + 150);

  document.getElementById("vencimiento").innerText =
    fecha.toISOString().split("T")[0];
}

function calcularVencimientoNormal(prod) {
  const vida = parseInt(prod["Vida Útil"]);
  const unidad = prod["UNM"].toLowerCase();
  let fecha = new Date();

  if (unidad.includes("día")) {
    fecha.setDate(fecha.getDate() + vida);
  } else if (unidad.includes("mes")) {
    fecha.setMonth(fecha.getMonth() + vida);
  }

  return fecha.toISOString().split("T")[0];
}
