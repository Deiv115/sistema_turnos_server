const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  connectTimeout: 10000, // 10 segundos
});

connection.connect(err => {
  if (err) {
    console.error('❌ Error al conectar a MySQL:', err);
    setTimeout(() => connection.connect(), 2000); // Intenta reconectar
  } else {
    console.log('✅ Conexión a MySQL exitosa.');
  }
});

// Manejar desconexiones
connection.on('error', function(err) {
  console.error('❌ Error de conexión MySQL:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ECONNRESET') {
    console.log('Reconectando a la base de datos...');
    setTimeout(() => connection.connect(), 2000);
  } else {
    throw err;
  }
});

module.exports = connection;
