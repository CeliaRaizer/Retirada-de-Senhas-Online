// src/server.js
require("dotenv").config();

const app = require("./app");
const http = require("http");
const passport = require("passport");

require("./config/passport");

const authRoutes = require("./routes/authRoutes");
const configurarSocket = require("./websocket/socket");

/* =====================================
   MIDDLEWARES
===================================== */
app.use(passport.initialize());

/* =====================================
   ROTAS
===================================== */
app.use("/auth", authRoutes);

/* =====================================
   SERVIDOR HTTP
===================================== */
const server = http.createServer(app);

/* =====================================
   SOCKET.IO (separado)
===================================== */
const io = configurarSocket(server);

/* disponibiliza io para controllers */
app.set("io", io);

/* =====================================
   PORTA
===================================== */

/* =====================================
   TRATAMENTO DE ERROS GLOBAL
===================================== */
process.on("uncaughtException", (err) => {
    console.error("Erro não capturado:", err.message);
});

process.on("unhandledRejection", (err) => {
    console.error("Promise rejeitada:", err?.message || err);
});

const PORT = 3000;

server.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});