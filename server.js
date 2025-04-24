// ✅ server.js optimizado
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);
const path = require("path");
const db = require("./db");
const session = require("express-session");
const fs = require("fs");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: "*T3o+1]dOy",
    resave: false,
    saveUninitialized: true,
  })
);

const usuariosActivos = {};
const modulosConectados = {};
let turnosAsignados = [];
let turnosPendientes = [];
let historialTurnos = [];
let turnoCount = 0;

function actualizarEstadoGlobal() {
  io.emit("actualizarTurnos", turnosAsignados, turnosPendientes);
  io.emit("estadoModulos", modulosConectados);
  io.emit("actualizarHistorial", historialTurnos);
}

function crearTurno(qrUrl = null, tipoTramite = null) {
  const modulosDisponibles = Object.keys(modulosConectados).filter(
    (m) => modulosConectados[m].disponible
  );

  turnoCount++;
  const turno = `T${String(turnoCount).padStart(3, "0")}`;
  const modulo = modulosDisponibles[0] || null;
  const usuario = modulo ? modulosConectados[modulo]?.usuario : "Pendiente";

  const nuevoTurno = { turno, modulo, qr: qrUrl, tramite: tipoTramite, usuario };

  if (modulo) {
    modulosConectados[modulo].disponible = false;
    turnosAsignados.push(nuevoTurno);
  } else {
    turnosPendientes.push(nuevoTurno);
    io.emit("sinModulosDisponibles");
  }

  db.query(
    "INSERT INTO gestionTramites (turno, modulo, qr, tramite, usuario) VALUES (?, ?, ?, ?, ?)",
    [turno, modulo, qrUrl || null, tipoTramite || null, usuario],
    (err) => {
      if (err) console.error("❌ Error al guardar turno:", err);
    }
  );

  actualizarEstadoGlobal();
  io.emit("contadorTurnos", turnoCount);
  io.emit("qrRecibido", nuevoTurno);
}

// 🧠 Middleware de sesión
function isAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

// 🧠 Rutas
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.redirect("/login?error=1");

  db.query(
    "SELECT * FROM usuarios WHERE usuario = ? AND contrasena = ?",
    [username, password],
    (err, results) => {
      if (err) return res.status(500).send("Error en la base de datos.");
      if (results.length > 0) {
        const moduloAsignado = results[0].moduloAsignado;

        if (usuariosActivos[moduloAsignado]) {
          return res.redirect("/login?error=2");
        }

        req.session.user = {
          username: results[0].usuario,
          modulo: moduloAsignado,
        };

        usuariosActivos[moduloAsignado] = true;

        if (moduloAsignado === "Recepcion") {
             return res.redirect("/admin");
        } else if (moduloAsignado === "Registrador") {
          return res.redirect("/registro");
        } else {
           return res.redirect("/modulo");
        }
      } else {
        return res.redirect("/login?error=1");
      }
    }
  );
});

function isRecepcion(req, res, next) {
    if (req.session.user?.modulo === "Recepcion") {
        return next();
    }
    res.redirect("/login?error=3");
}

function isAdmin(req, res, next) {
  if (req.session.user?.modulo === "Registrador") {
    return next();
  }
  res.redirect("/login?error=4");
}

// Descargar Excel
const XLSX = require("xlsx");

app.get("/descargarExcel", isAuthenticated, isAdmin, (req, res) => {
  const { desde, hasta } = req.query;

  let query = "SELECT turno, modulo, qr, tramite, usuario, fecha FROM gestionTramites";
  const params = [];

  if (desde && hasta) {
    query += " WHERE DATE(fecha) BETWEEN ? AND ?";
    params.push(desde, hasta);
  } else if (desde) {
    query += " WHERE DATE(fecha) = ?";
    params.push(desde);
  }

  db.query(query, params, (err, resultados) => {
    if (err) {
      console.error("❌ Error al generar Excel:", err);
      return res.status(500).send("Error al generar el archivo");
    }

    // Cambiar nombres de columnas
    const datosFormateados = resultados.map(row => ({
      "ID": row.id,
      "Turno": row.turno,
      "Módulo": row.modulo,
      "Código QR": row.qr,
      "Trámite": row.tramite,
      "Usuario": row.usuario,
      "Fecha": row.fecha,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(datosFormateados);
    XLSX.utils.book_append_sheet(wb, ws, "Tramites");

    let nombreArchivo = "tramites";
    if (desde && hasta && desde !== hasta) {
      nombreArchivo += `-${desde}-al-${hasta}`;
    } else if (desde) {
      nombreArchivo += `-${desde}`;
    } else {
      const hoy = new Date().toISOString().split("T")[0];
      nombreArchivo += `-${hoy}`;
    }

    const filePath = path.join(__dirname, "public", `${nombreArchivo}.xlsx`);
    XLSX.writeFile(wb, filePath);

    res.download(filePath, `${nombreArchivo}.xlsx`, (err) => {
      if (err) console.error("❌ Error al descargar archivo:", err);
      fs.unlinkSync(filePath);
    });
  });
});


// Obtener todos los usuarios
app.get("/usuarios", async (req, res) => {
  db.query("SELECT * FROM usuarios", (err, rows) => {;
  if (err){
      console.error("❌ Error al obtener usuarios:", err);
      return res.status(500).send("Error en la base de datos.");
  }
    res.json(rows);
 });
});

// Registrar usuario
app.post("/usuarios", (req, res) => {
  const { nombreCompleto, usuario, contrasena, moduloAsignado } = req.body;
  db.query(
    "INSERT INTO usuarios (nombreCompleto, usuario, contrasena, moduloAsignado) VALUES (?, ?, ?, ?)",
    [nombreCompleto, usuario, contrasena, moduloAsignado],
    (err) => {
      if (err) {
        console.error("❌ Error al guardar usuario:", err);
        return res.status(500).send("Error al guardar usuario.");
      }
      res.sendStatus(201);
    }
  );
});

// Modificar usuario
app.put("/usuarios/:id", (req, res) => {
  const { id } = req.params;
  const { nombreCompleto, usuario, contrasena, moduloAsignado } = req.body;
  db.query(
    "UPDATE usuarios SET nombreCompleto=?, usuario=?, contrasena=?, moduloAsignado=? WHERE id=?",
    [nombreCompleto, usuario, contrasena, moduloAsignado, id],
    (err) => {
      if (err) {
        console.error("❌ Error al actualizar usuario:", err);
        return res.status(500).send("Error al actualizar usuario.");
      }
      res.sendStatus(200);
    }
  );
});

// Eliminar usuario
app.delete("/usuarios/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM usuarios WHERE id=?", [id], (err) => {
    if (err) {
      console.error("❌ Error al eliminar usuario:", err);
      return res.status(500).send("Error al eliminar usuario.");
    }
    res.sendStatus(200);
  });
});


app.get("/registro", isAuthenticated, isAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "views/registro.html"));
});

app.get("/admin", isAuthenticated, isRecepcion, (req, res) => {
    res.sendFile(path.join(__dirname, "views/admin.html"));
});

app.get("/modulo", isAuthenticated, (req, res) => {
  const modulo = req.session.user.modulo;
  if (!modulo) return res.status(403).send("No tienes un módulo asignado.");
  res.redirect(`/modulo/${modulo}`);
});

app.get("/modulo/:modulo", isAuthenticated, (req, res) => {
  if (req.params.modulo !== req.session.user.modulo) {
    return res.status(403).send("Acceso denegado. Este módulo no te corresponde.");
  }
  res.sendFile(path.join(__dirname, "views/modulo.html"));
});

app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "views/login.html")));

app.get("/obtenerModulo", isAuthenticated, (req, res) => {
  res.json({ modulo: req.session.user?.modulo });
});

app.get("/obtenerUsuario", isAuthenticated, (req, res) => {
  res.json({ username: req.session.user?.username });
});

app.get("/logout", (req, res) => {
  const modulo = req.session.user?.modulo;
  if (modulo) delete usuariosActivos[modulo];
  req.session.destroy(() => res.redirect("/login"));
});

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Servidor corriendo en http://localhost:${PORT}`));

// 🧠 Socket.IO
io.on("connection", (socket) => {
  socket.on("solicitarEstadoModulos", () => {
    socket.emit("estadoModulos", modulosConectados);
  });
  console.log("✅ Usuario conectado");

  socket.on("moduloConectado", ({ modulo, usuario }) => {
    modulosConectados[modulo] = {
      socketId: socket.id,
      disponible: true,
      usuario
    };

    const turnoActual = turnosAsignados.find(t => t.modulo === modulo);
    if (turnoActual){
       io.to(socket.id).emit("actualizarTurnoModulo", turnoActual);
    } else if (turnosPendientes.length > 0){
      // Asignar automáticamente el siguiente turno pendiente
      const siguienteTurno = turnosPendientes.shift();
      siguienteTurno.modulo = modulo;
      siguienteTurno.usuario = usuario;

      turnosAsignados.push(siguienteTurno);
      modulosConectados[modulo].disponible = false;

      db.query(
        "UPDATE gestionTramites SET modulo = ?, usuario = ? WHERE turno = ?",
        [modulo, usuario, siguienteTurno.turno],
        (err) => {
          if (err) console.error("❌ Error al asignar turno pendiente automáticamente:", err);
        }
      );

      io.to(socket.id).emit("actualizarTurnoModulo", siguienteTurno);
    }

    actualizarEstadoGlobal();
    console.log(`🟢 Módulo ${modulo} conectado por ${usuario}`);
  });

  socket.on("generarTurno", () => crearTurno());
  socket.on("qrEscaneado", ({ qrUrl, tipoTramite }) => crearTurno(qrUrl, tipoTramite));

  socket.on("liberarModulo", (modulo) => {
    const turnoLiberado = turnosAsignados.find(t => t.modulo === modulo);

    if (turnoLiberado) {
      historialTurnos.push(turnoLiberado);
      turnosAsignados = turnosAsignados.filter(t => t.modulo !== modulo);
      io.emit("turnoAnterior", turnoLiberado);
    }

    if (turnosPendientes.length > 0) {
      const siguienteTurno = turnosPendientes.shift();
      siguienteTurno.modulo = modulo;
      siguienteTurno.usuario = modulosConectados[modulo]?.usuario;
      io.to(modulosConectados[modulo].socketId).emit("actualizarTurnoModulo", siguienteTurno);

      modulosConectados[modulo].disponible = false;
      turnosAsignados.push(siguienteTurno);

      db.query(
        "UPDATE gestionTramites SET modulo = ?, usuario = ? WHERE turno = ?",
        [modulo, siguienteTurno.usuario, siguienteTurno.turno],
        (err) => {
          if (err) console.error("❌ Error al actualizar turno pendiente:", err);
        }
      );
    } else {
      modulosConectados[modulo].disponible = true;
      console.log(`🔵 Módulo ${modulo} está disponible nuevamente.`);
    }

    actualizarEstadoGlobal();
  });

  socket.on("disconnect", () => {
    const moduloDesconectado = Object.keys(modulosConectados).find(
      m => modulosConectados[m].socketId === socket.id
    );
    if (moduloDesconectado) {
      delete modulosConectados[moduloDesconectado];
      delete usuariosActivos[moduloDesconectado];
      console.log(`🔴 Módulo ${moduloDesconectado} desconectado`);
      io.emit("estadoModulos", modulosConectados);
    } else {
      console.log("🔌 Usuario desconectado");
    }
  });

  socket.emit("actualizarTurnos", turnosAsignados, turnosPendientes);
});
