const params = new URLSearchParams(window.location.search);
if (params.get("error") === "1") {
    document.getElementById("errorAlert").textContent = "Usuario o contraseña incorrectos.";
    document.getElementById("errorAlert").classList.remove("d-none");
}
if (params.get("error") === "2") {
    document.getElementById("errorAlert").textContent = "Este módulo ya está en uso. Cierre sesión desde el otro dispositivo.";
    document.getElementById("errorAlert").classList.remove("d-none");
}
if (params.get("error") === "3") {
    document.getElementById("errorAlert").textContent = "Solo personal autorizado puede acceder a esa sección.";
    document.getElementById("errorAlert").classList.remove("d-none");
}
if (params.get("error") === "4") {
    document.getElementById("errorAlert").textContent = "Solo el Registrador puede acceder a esa sección.";
    document.getElementById("errorAlert").classList.remove("d-none");
}