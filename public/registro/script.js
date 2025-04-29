document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("formRegistro");
    const tabla = document.getElementById("tablaUsuarios");
    const modalEditar = new bootstrap.Modal(document.getElementById("modalEditar"));

    const cargarUsuarios = async () => {
        try {
            tabla.innerHTML = "";
            const res = await fetch("/usuarios");
            if (!res.ok) throw new Error("Error al cargar usuarios");
            const usuarios = await res.json();

            usuarios.forEach(usuario => {
                const tr = document.createElement("tr");
                tr.innerHTML = `
                    <td>${usuario.nombreCompleto}</td>
                    <td>${usuario.usuario}</td>
                    <td>${usuario.moduloAsignado}</td>
                    <td><button class="btn btn-warning btn-sm" onclick="modificar(${usuario.id})">Modificar</button></td>
                    <td><button class="btn btn-danger btn-sm" onclick="eliminar(${usuario.id})">Eliminar</button></td>
                `;
                tabla.appendChild(tr);
            });
        } catch (error) {
            console.error("❌ Error al cargar usuarios:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudieron cargar los usuarios",
            });
        }
    };

    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const datos = new FormData(form);
        const data = Object.fromEntries(datos);

        try {
            const res = await fetch("/usuarios", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) throw new Error("Error al registrar usuario");

            Swal.fire({
                icon: "success",
                title: "Registrado",
                text: "Usuario registrado correctamente",
                timer: 2000,
                showConfirmButton: false,
            });

            form.reset();
            cargarUsuarios();
        } catch (error) {
            console.error("❌ Error al registrar usuario:", error);
            Swal.fire({
                icon: "error",
                title: "Error",
                text: "No se pudo registrar el usuario.",
            });
        }
    });

    window.modificar = async (id) => {
        try {
            const res = await fetch("/usuarios");
            if (!res.ok) throw new Error("Error al obtener datos para editar");

            const usuarios = await res.json();
            const usuario = usuarios.find(u => u.id === id);
            if (!usuario) return Swal.fire("Error", "Usuario no encontrado", "error");

            document.getElementById("editId").value = usuario.id;
            document.getElementById("editNombre").value = usuario.nombreCompleto;
            document.getElementById("editUsuario").value = usuario.usuario;
            document.getElementById("editContrasena").value = usuario.contrasena;
            document.getElementById("editModulo").value = usuario.moduloAsignado;

            modalEditar.show();
        } catch (error) {
            console.error("❌ Error al cargar usuario:", error);
            Swal.fire("Error", "No se pudo cargar el usuario para editar", "error");
        }
    };

    document.getElementById("formEditar").addEventListener("submit", async (e) => {
        e.preventDefault();
        const id = document.getElementById("editId").value;
        const data = {
            nombreCompleto: document.getElementById("editNombre").value,
            usuario: document.getElementById("editUsuario").value,
            contrasena: document.getElementById("editContrasena").value,
            moduloAsignado: document.getElementById("editModulo").value,
        };

        try {
            const res = await fetch(`/usuarios/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) throw new Error("Error al actualizar usuario");

            modalEditar.hide();
            cargarUsuarios();

            Swal.fire({
                icon: "success",
                title: "Actualizado",
                text: "Usuario modificado correctamente",
                timer: 2000,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error("❌ Error al actualizar usuario:", error);
            Swal.fire("Error", "No se pudo actualizar el usuario", "error");
        }
    });

    window.eliminar = async (id) => {
        const confirm = await Swal.fire({
            title: "¿Estás seguro?",
            text: "Esta acción eliminará al usuario permanentemente.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
        });

        if (!confirm.isConfirmed) return;

        try {
            const res = await fetch(`/usuarios/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Error al eliminar");

            cargarUsuarios();

            Swal.fire({
                icon: "info",
                title: "Eliminado",
                text: "El usuario ha sido eliminado.",
                timer: 2000,
                showConfirmButton: false,
            });
        } catch (error) {
            console.error("❌ Error al eliminar usuario:", error);
            Swal.fire("Error", "No se pudo eliminar el usuario", "error");
        }
    };

    cargarUsuarios();
});

function descargarPorFechas() {
    const desde = document.getElementById("fechaDesde").value;
    const hasta = document.getElementById("fechaHasta").value;
  
    if (!desde && !hasta) {
      Swal.fire("Selecciona al menos una fecha");
      return;
    }
  
    let url = `/descargarExcel?`;
    if (desde) url += `desde=${desde}`;
    if (hasta) url += `&hasta=${hasta}`;
  
    window.location.href = url;
  }
  
  function descargarTodo() {
    window.location.href = `/descargarExcel`;
  }  
  