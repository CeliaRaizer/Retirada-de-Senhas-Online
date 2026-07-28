const mysql = require("mysql2");

const db = mysql.createPool({
    host:               process.env.DB_HOST || "localhost",
    port:               process.env.DB_PORT || 3306,
    user:               process.env.DB_USER || "root",
    password:           process.env.DB_PASSWORD ?? "celia",
    database:           process.env.DB_NAME || "bdsenha",
    waitForConnections: true,   // aguarda conexão disponível em vez de dar erro
    connectionLimit:    10,     // máximo de conexões simultâneas
    queueLimit:         0       // fila ilimitada
});

// testa se o pool está funcionando ao iniciar
db.getConnection((err, connection) => {
    if (err) {
        console.error("Erro ao conectar ao MySQL:", err.message);
    } else {
        console.log("MySQL conectado! (pool)");
        connection.release(); // devolve a conexão ao pool
    }
});

module.exports = db;