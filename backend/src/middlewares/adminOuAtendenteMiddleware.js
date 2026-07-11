// Deixa passar admin OU atendente — útil para rotas de leitura
// que os dois perfis precisam acessar (ex: listar fila do dia).
const verificarPerfil = require("./verificarPerfil");

module.exports = verificarPerfil(["admin", "atendente"]);