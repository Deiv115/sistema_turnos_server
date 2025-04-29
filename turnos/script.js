// ✅ turnos.js optimizado
const socket = io("https://sistemas.impuestosdurango.com");

const audioTurno = new Audio("turnos/Source/bell.mp3");

const botonActivar = document.getElementById("activarSonido");

botonActivar.addEventListener("click", () => {
  // ⚠️ Esto desbloquea la reproducción de audio
  audioTurno.play().then(() => {
    console.log("✅ Sonido activado");
    botonActivar.style.display = "none"; // Ocultar el botón después
  }).catch(err => {
    console.error("❌ Error al activar sonido:", err);
  });
});


let ultimoTurnoActual = null;

socket.on("turnoAnterior", (turnoAnterior) => {
  document.getElementById("turnoNumeroAnterior").textContent = turnoAnterior.turno || "---";
  document.getElementById("moduloNumeroAnterior").textContent = turnoAnterior.modulo || "---";
});

socket.on("actualizarTurnos", (asignados = [], pendientes = []) => {
  const total = asignados.length;
  const anterior = total >= 2 ? asignados[total - 2] : null;
  const actual = total >= 1 ? asignados[total - 1] : null;
  const siguiente = pendientes.length > 0 ? pendientes[0] : null;

  // Verificar si hay un nuevo turno actual
  if (actual?.turno && actual.turno !== ultimoTurnoActual) {
    audioTurno.play().catch(e => console.warn("No se pudo reproducir el audio:", e));
    ultimoTurnoActual = actual.turno;
  }  

  document.getElementById("turnoNumeroAnterior").textContent = anterior?.turno || "---";
  document.getElementById("moduloNumeroAnterior").textContent = anterior?.modulo || "---";

  document.getElementById("turnoNumero").textContent = actual?.turno || "---";
  document.getElementById("moduloNumero").textContent = actual?.modulo || "---";

  document.getElementById("turnoNumeroSiguiente").textContent = siguiente?.turno || "---";
  document.getElementById("moduloNumeroSiguiente").textContent = "---";
});
