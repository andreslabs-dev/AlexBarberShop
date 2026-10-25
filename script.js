// Alex Barbershop: reserva página a página en un solo documento.
// La reserva se guarda en localStorage para que no se pierda al recargar.

const CLAVE_RESERVA = "alexBarber_reserva";
const CLAVE_OCUPADOS = "alexBarber_ocupados";

const HORARIOS = [
  "9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM",
  "12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM", "2:00 PM", "2:30 PM",
  "3:00 PM", "3:30 PM", "4:00 PM", "4:30 PM"
];
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DIAS = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

const PANTALLAS = ["inicio", "barbero", "servicio", "fecha", "confirmar"];
const PASOS = ["barbero", "servicio", "fecha", "confirmar"];
const SIGUIENTE = { barbero: "servicio", servicio: "fecha", fecha: "confirmar" };

// ===== Almacenamiento =====
function leer(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v ? JSON.parse(v) : porDefecto;
  } catch (e) {
    return porDefecto;
  }
}
function guardar(clave, valor) {
  try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) {}
}
function obtenerReserva() {
  return leer(CLAVE_RESERVA, { barbero: null, servicio: null, precio: null, fecha: null, hora: null });
}
function actualizarReserva(cambios) {
  guardar(CLAVE_RESERVA, Object.assign(obtenerReserva(), cambios));
}
function limpiarReserva() {
  try { localStorage.removeItem(CLAVE_RESERVA); } catch (e) {}
}

// ===== Utilidades de fecha =====
function formatoFecha(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const dia = new Date(y, m - 1, d).getDay();
  return { largo: `${DIAS[dia]} ${d} de ${MESES[m - 1]} ${y}`, corto: `${d} de ${MESES[m - 1]} ${y}` };
}
function formatoISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ===== Navegación página a página =====
function pantallaActual() {
  return document.querySelector(".pantalla.activa");
}

// Devuelve la pantalla a la que realmente se puede ir (no se puede saltar pasos).
function destinoPermitido(id) {
  const r = obtenerReserva();
  if (id === "servicio" && !r.barbero) return "barbero";
  if (id === "fecha" && (!r.barbero || !r.servicio)) return r.barbero ? "servicio" : "barbero";
  if (id === "confirmar" && (!r.barbero || !r.servicio || !r.fecha || !r.hora)) return "fecha";
  return id;
}

function irA(id, { historial = true } = {}) {
  if (!PANTALLAS.includes(id)) id = "inicio";
  id = destinoPermitido(id);

  const nueva = document.getElementById(id);
  const actual = pantallaActual();
  if (!nueva || nueva === actual) return;

  const avanza = actual ? PANTALLAS.indexOf(id) > PANTALLAS.indexOf(actual.id) : true;

  // La nueva entra desde el lado correcto, sin transición, y luego se activa
  nueva.classList.add("sin-transicion");
  nueva.classList.remove("activa", "antes", "despues");
  nueva.classList.add(avanza ? "antes" : "despues");
  void nueva.offsetWidth;
  nueva.classList.remove("sin-transicion");

  if (actual) {
    actual.classList.remove("activa");
    actual.classList.add(avanza ? "despues" : "antes");
  }
  nueva.classList.remove("antes", "despues");
  nueva.classList.add("activa");
  nueva.scrollTop = 0;

  if (id === "confirmar") pintarResumen();
  if (id === "fecha") pintarCalendarioEnPantalla();

  actualizarBarra(id);
  if (historial && location.hash !== "#" + id) {
    history.pushState(null, "", "#" + id);
  }
  setTimeout(() => nueva.focus({ preventScroll: true }), 50);
}

function actualizarBarra(id) {
  const barra = document.getElementById("barra");
  barra.classList.toggle("en-inicio", id === "inicio");
  const indice = PASOS.indexOf(id);
  document.querySelectorAll("[data-paso]").forEach((el) => {
    const i = PASOS.indexOf(el.dataset.paso);
    el.classList.toggle("hecho", indice > i);
    el.classList.toggle("actual", indice === i);
  });
}

function mostrarAviso(id, texto, esError = true) {
  const aviso = document.querySelector(`#${id} .aviso`);
  if (!aviso) return;
  aviso.textContent = texto;
  aviso.classList.remove("error");
  if (texto && esError) {
    void aviso.offsetWidth;
    aviso.classList.add("error");
  }
}

// ===== Paso 1: barbero =====
function iniciarBarbero() {
  const opciones = document.querySelectorAll(".opcion[data-barbero]");
  const marcar = () => {
    const r = obtenerReserva();
    opciones.forEach((o) => o.classList.toggle("elegida", o.dataset.barbero === r.barbero));
  };
  opciones.forEach((op) => {
    op.addEventListener("click", () => {
      actualizarReserva({ barbero: op.dataset.barbero });
      marcar();
      pulsar(op);
      mostrarAviso("barbero", "", false);
    });
  });
  marcar();
}

// ===== Paso 2: servicio =====
function iniciarServicio() {
  const opciones = document.querySelectorAll(".opcion[data-servicio]");
  const marcar = () => {
    const r = obtenerReserva();
    opciones.forEach((o) => o.classList.toggle("elegida", o.dataset.servicio === r.servicio));
  };
  opciones.forEach((op) => {
    op.addEventListener("click", () => {
      actualizarReserva({ servicio: op.dataset.servicio, precio: Number(op.dataset.precio) });
      marcar();
      pulsar(op);
      mostrarAviso("servicio", "", false);
    });
  });
  marcar();
}

function pulsar(el) {
  el.classList.remove("pulso");
  void el.offsetWidth;
  el.classList.add("pulso");
}

// ===== Paso 3: fecha y hora =====
let ocupados = {};
let mesVista = null;
let hoy = null;

function iniciarFecha() {
  ocupados = leer(CLAVE_OCUPADOS, {});
  hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const r = obtenerReserva();
  mesVista = r.fecha
    ? (([y, m]) => new Date(y, m - 1, 1))(r.fecha.split("-").map(Number))
    : new Date(hoy.getFullYear(), hoy.getMonth(), 1);

  document.getElementById("mes-anterior").addEventListener("click", () => {
    mesVista = new Date(mesVista.getFullYear(), mesVista.getMonth() - 1, 1);
    pintarCalendario();
  });
  document.getElementById("mes-siguiente").addEventListener("click", () => {
    mesVista = new Date(mesVista.getFullYear(), mesVista.getMonth() + 1, 1);
    pintarCalendario();
  });
}

function pintarCalendarioEnPantalla() {
  const r = obtenerReserva();
  if (r.fecha) {
    const [y, m] = r.fecha.split("-").map(Number);
    mesVista = new Date(y, m - 1, 1);
  }
  pintarCalendario();
  pintarHorarios(true);
}

function pintarCalendario() {
  const r = obtenerReserva();
  const year = mesVista.getFullYear();
  const month = mesVista.getMonth();
  const calendario = document.getElementById("calendario");
  document.getElementById("mes-titulo").textContent = `${MESES[month]} ${year}`;
  calendario.innerHTML = "";

  const primerDia = (new Date(year, month, 1).getDay() + 6) % 7; // semana empieza en lunes
  for (let i = 0; i < primerDia; i++) {
    const v = document.createElement("span");
    v.className = "vacio";
    calendario.appendChild(v);
  }

  const diasMes = new Date(year, month + 1, 0).getDate();
  for (let dia = 1; dia <= diasMes; dia++) {
    const fecha = new Date(year, month, dia);
    const iso = formatoISO(fecha);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = dia;
    btn.style.setProperty("--d", dia);
    btn.disabled = fecha < hoy || fecha.getDay() === 0; // sin días pasados ni domingos
    if (r.fecha === iso) btn.classList.add("elegido");
    btn.addEventListener("click", () => {
      actualizarReserva({ fecha: iso, hora: null });
      calendario.querySelectorAll("button").forEach((b) => b.classList.remove("elegido"));
      btn.classList.add("elegido");
      pintarHorarios(true);
      mostrarAviso("fecha", "", false);
    });
    calendario.appendChild(btn);
  }
}

function pintarHorarios(animar = false) {
  const cont = document.getElementById("horarios");
  const texto = document.getElementById("fecha-elegida");
  const r = obtenerReserva();
  cont.innerHTML = "";

  if (!r.fecha) {
    texto.textContent = "Selecciona un día";
    return;
  }
  texto.textContent = formatoFecha(r.fecha).largo;

  const ocupadosDia = ocupados[r.fecha] || [];
  HORARIOS.forEach((hora, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = hora;
    btn.style.setProperty("--d", i);
    btn.disabled = ocupadosDia.includes(hora);
    if (r.hora === hora) btn.classList.add("elegido");
    btn.addEventListener("click", () => {
      actualizarReserva({ hora });
      cont.querySelectorAll("button").forEach((b) => b.classList.remove("elegido"));
      btn.classList.add("elegido");
      mostrarAviso("fecha", "", false);
    });
    cont.appendChild(btn);
  });

  if (animar) {
    cont.classList.remove("entrar");
    void cont.offsetWidth;
    cont.classList.add("entrar");
  }
}

// ===== Resumen y confirmación =====
const formatoCOP = (n) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

function pintarResumen() {
  const r = obtenerReserva();
  const faltan = !r.barbero || !r.servicio || !r.fecha || !r.hora;

  // Vuelve al estado de resumen (por si ya se confirmó antes en esta sesión)
  document.getElementById("bloque-resumen").hidden = false;
  document.getElementById("exito").hidden = true;
  document.getElementById("titulo-confirmar").textContent = "TU RESERVA";
  document.getElementById("confirmar-btn").disabled = faltan;

  document.getElementById("r-barbero").textContent = r.barbero || "—";
  document.getElementById("r-servicio").textContent = r.servicio
    ? `${r.servicio}${r.precio ? ` (${formatoCOP(r.precio)})` : ""}`
    : "—";
  document.getElementById("r-fecha").textContent = r.fecha ? formatoFecha(r.fecha).corto : "—";
  document.getElementById("r-hora").textContent = r.hora || "—";

  mostrarAviso("confirmar", faltan ? "Te faltan datos para la reserva. Completa los pasos." : "", false);
}

function confirmarReserva() {
  const r = obtenerReserva();
  if (!r.fecha || !r.hora) return;

  const ocupadosNuevos = leer(CLAVE_OCUPADOS, {});
  ocupadosNuevos[r.fecha] = (ocupadosNuevos[r.fecha] || []).concat(r.hora);
  guardar(CLAVE_OCUPADOS, ocupadosNuevos);

  document.getElementById("exito-texto").textContent =
    `Tu cita con ${r.barbero} para ${r.servicio} quedó el ${formatoFecha(r.fecha).corto} a las ${r.hora}.`;
  document.getElementById("bloque-resumen").hidden = true;
  document.getElementById("exito").hidden = false;
  document.getElementById("titulo-confirmar").textContent = "¡LISTO!";
}

function nuevaReserva() {
  limpiarReserva();
  document.querySelectorAll(".opcion.elegida").forEach((o) => o.classList.remove("elegida"));
  document.querySelectorAll(".cal-dias button.elegido, .horarios button.elegido")
    .forEach((b) => b.classList.remove("elegido"));
  mostrarAviso("fecha", "", false);
  irA("inicio");
}

// ===== Eventos globales =====
const VALIDACIONES = {
  barbero: (r) => (r.barbero ? null : "Elige un barbero para continuar."),
  servicio: (r) => (r.servicio ? null : "Elige un servicio para continuar."),
  fecha: (r) => (!r.fecha ? "Elige una fecha." : !r.hora ? "Elige una hora." : null),
};

document.addEventListener("click", (e) => {
  const ir = e.target.closest("[data-ir]");
  if (ir) {
    irA(ir.dataset.ir);
    return;
  }

  const continuar = e.target.closest("[data-continuar]");
  if (continuar) {
    const id = continuar.closest(".pantalla").id;
    const error = VALIDACIONES[id](obtenerReserva());
    if (error) mostrarAviso(id, error);
    else irA(SIGUIENTE[id]);
    return;
  }

  if (e.target.closest("#confirmar-btn")) {
    confirmarReserva();
    return;
  }
  if (e.target.closest("#nueva")) {
    nuevaReserva();
  }
});

window.addEventListener("hashchange", () => {
  irA(location.hash.slice(1) || "inicio", { historial: false });
});

// ===== Arranque =====
document.addEventListener("DOMContentLoaded", () => {
  iniciarBarbero();
  iniciarServicio();
  iniciarFecha();

  const inicial = location.hash.slice(1);
  const actual = destinoPermitido(PANTALLAS.includes(inicial) ? inicial : "inicio");
  const pantalla = document.getElementById(actual);
  if (actual === "inicio") {
    actualizarBarra("inicio");
  } else {
    // Entrada directa a un paso: se muestra sin animación de salida
    document.querySelectorAll(".pantalla.activa").forEach((p) => p.classList.remove("activa"));
    pantalla.classList.add("activa");
    pantalla.classList.add("sin-transicion");
    void pantalla.offsetWidth;
    pantalla.classList.remove("sin-transicion");
    actualizarBarra(actual);
    if (actual === "fecha") pintarCalendarioEnPantalla();
    if (actual === "confirmar") pintarResumen();
  }
  if (location.hash !== "#" + actual) history.replaceState(null, "", "#" + actual);
});
