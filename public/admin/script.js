// ✅ admin.js restaurado con persistencia de filas y alertas modales personalizadas
const socket = io();
socket.emit("solicitarEstadoModulos");

const tbody = document.getElementById("adminTurnosBody");
const estadoModulos = document.getElementById("estadoModulos");
const tramiteSelect = document.getElementById("tipoTramite");
const qrInput = document.getElementById("qrScanner");

let alertModal, alertModalBody, alertModalTitle;

window.addEventListener("DOMContentLoaded", () => {
  alertModal = new bootstrap.Modal(document.getElementById("alertModal"));
  alertModalBody = document.querySelector("#alertModal .modal-body");
  alertModalTitle = document.querySelector("#alertModal .modal-title");

  $('#onload').modal('show');
});

let turnosRenderizados = new Map();
let contadorID = 1;

function mostrarAlerta(titulo, mensaje, tipo = 'warning') {
  alertModalTitle.textContent = titulo;
  alertModalBody.innerHTML = mensaje;
  const modalContent = document.querySelector("#alertModal .modal-content");

  modalContent.className = "modal-content text-white"; // reset
  switch (tipo) {
    case "success":
      modalContent.classList.add("bg-success");
      break;
    case "danger":
      modalContent.classList.add("bg-danger");
      break;
    case "info":
      modalContent.classList.add("bg-info");
      break;
    default:
      modalContent.classList.add("bg-warning", "text-dark");
  }

  alertModal.show();
}

qrInput.addEventListener("input", () => {
  clearTimeout(window.scanTimeout);
  window.scanTimeout = setTimeout(() => {
    let qrUrl = qrInput.value.trim();
    const tipoTramite = tramiteSelect.value;

    if (!qrUrl) return;

    if (!tipoTramite || tipoTramite.includes("Seleccione")) {
      mostrarAlerta("Trámite no seleccionado", "⚠️ Por favor, selecciona un trámite antes de escanear el QR.", "danger");
      qrInput.value = "";
      return;
    }

    qrUrl = qrUrl.replace(/\s+/g, "").match(/https?:\/\/[^\s]+/)?.[0] || "";

    if (!qrUrl) {
      mostrarAlerta("QR inválido", "⚠️ El código QR escaneado no contiene una URL válida.", "danger");
      qrInput.value = "";
      return;
    }

    socket.emit("qrEscaneado", { qrUrl, tipoTramite });
    qrInput.value = "";
  }, 300);
});

function renderFila(turno) {
  const id = turno.turno;
  if (turnosRenderizados.has(id)) {
    const row = turnosRenderizados.get(id);
    actualizarFila(row, turno, row.dataset.index);
    return;
  }

  const row = document.createElement("tr");
  row.setAttribute("data-id", id);
  row.setAttribute("data-index", contadorID)
  actualizarFila(row, turno, contadorID);
  tbody.appendChild(row);
  turnosRenderizados.set(id, row);
  contadorID++;
}

function actualizarFila(row, turno, index) {
  row.innerHTML = `
    <td>${index}</td>
    <td>${turno.turno}</td>
    <td>${turno.modulo || "Pendiente"}</td>
    <td class="qr-cell">${turno.qr ? `<a href="${turno.qr}" target="_blank">Ver QR</a>` : "Esperando QR..."}</td>
    <td>${turno.tramite || ""}</td>
  `;
}

socket.on("actualizarTurnos", (asignados = [], pendientes = []) => {
  [...asignados, ...pendientes].forEach(renderFila);
});

socket.on("turnoAnterior", (turno) => {
  renderFila(turno);
});

socket.on("turnoLiberado", renderFila);
socket.on("qrRecibido", renderFila);

socket.on("sinModulosDisponibles", () => {
  mostrarAlerta("Módulos Ocupados", "⚠️ Todos los módulos están ocupados. Espere a que se libere uno.", "warning");
});

socket.on("estadoModulos", (modulos) => {
  estadoModulos.innerHTML = "";
  Object.entries(modulos).forEach(([modulo, info]) => {
    const div = document.createElement("div");
    div.className = "col-md-2 text-center";
    const color = info.disponible ? "green" : "red";
    div.innerHTML = `
      <div style="width: 20px; height: 20px; background-color: ${color}; border-radius: 50%; margin: 0 auto;"></div>
      <p>${modulo}</p>
    `;
    estadoModulos.appendChild(div);
  });
});