// src/app.js
const express = require("express");
const cors = require("cors");

const app = express();

// Atrás do Nginx (proxy reverso), sem isso o Express não enxerga o IP
// real do cliente nem o protocolo original — afeta o rate limit por IP
// e a URL de callback do login Google.
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());

// rota de teste
app.get("/", (req, res) => {
    res.send("API funcionando ");
});

// importar rotas
const senhaRoutes = require("./routes/senhaRoutes");
const atendenteRoutes = require("./routes/atendenteRoutes");

// usar rotas
app.use("/api", senhaRoutes);
app.use("/api/atendentes", atendenteRoutes);


app.use(express.static("public"));

module.exports = app;