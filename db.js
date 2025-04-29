const mysql = require("mysql2");

const pool = mysql.createPool({
    host: "srv1960.hstgr.io",
    user: "u985332196_impuestosdgo",
    password: "DGO2025AL",
    database: "u985332196_Turnos",
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Error al conectar con MySQL:", err);
    } else {
        console.log("✅ Conectado a la base de datos MySQL");
        connection.release();
    }
});

module.exports = pool;