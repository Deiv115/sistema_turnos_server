// ✅ modulo.js optimizado
const socket = io();

let modulo = "";
let usuario = "";

// Obtener módulo y usuario de la sesión
Promise.all([
  fetch("/obtenerModulo").then(res => res.json()),
  fetch("/obtenerUsuario").then(res => res.json())
]).then(([moduloData, usuarioData]) => {
  modulo = moduloData.modulo || "Desconocido";
  usuario = usuarioData.username || "Desconocido";

  document.getElementById("moduloNombre").textContent = modulo;
  socket.emit("moduloConectado", { modulo, usuario });
});

// Liberar módulo
const liberarBtn = document.getElementById("liberarModulo");
liberarBtn.addEventListener("click", () => {
  if (modulo) socket.emit("liberarModulo", modulo);
});

// Mostrar alerta en modal (ahora usando modal estático)
document.addEventListener("DOMContentLoaded", () => {
  const modalElement = document.getElementById("modalAlerta");
  const modalInstance = new bootstrap.Modal(modalElement);
  const modalTitle = modalElement.querySelector(".modal-title");
  const modalBody = modalElement.querySelector(".modal-body");

  window.mostrarAlertaModal = (titulo, mensaje) => {
    modalTitle.textContent = titulo;
    modalBody.innerHTML = mensaje;
    modalInstance.show();
  };
});


function limpiarVistaTurno() {
  document.getElementById("turnoAsignado").textContent = "Esperando turno...";
  document.getElementById("tramiteAsignado").textContent = "Esperando trámite...";
  document.getElementById("qrAsignado").textContent = "No disponible";
  document.getElementById("qrLink").style.display = "none";
}

// Actualizar datos del turno
function actualizarVistaTurno(turno) {
  const defaultMsg = "Esperando turno...";
  const tramiteMsg = "Esperando trámite...";
  const qrElement = document.getElementById("qrLink");

  document.getElementById("turnoAsignado").textContent = turno?.turno || defaultMsg;
  document.getElementById("tramiteAsignado").textContent = turno?.tramite || tramiteMsg;
  document.getElementById("qrAsignado").textContent = turno?.qr || "No disponible";

  if (turno?.qr) {
    qrElement.href = turno.qr;
    qrElement.style.display = "inline";
  } else {
    qrElement.style.display = "none";
  }
}

socket.on("actualizarTurnos", (asignados = [], pendientes = []) => {
  const turno = asignados.find(t => t.modulo === modulo);
  if (turno) {
    actualizarVistaTurno(turno);
  } else {
    limpiarVistaTurno();
    //Buscar si hay un turno pendiente sin módulo y asignarlo automaticamente
    if (pendientes.length > 0){
      socket.emit("asignarTurnoPendiente", { modulo, usuario });
    }
  }
});

socket.on("actualizarTurnoModulo", (turno) => {
  actualizarVistaTurno(turno);
  mostrarAlertaModal(
    "Nuevo Turno Asignado",
    `Se ha asignado el turno <strong>${turno.turno}</strong> con el trámite <strong>${turno.tramite}</strong>.`
  );
});
