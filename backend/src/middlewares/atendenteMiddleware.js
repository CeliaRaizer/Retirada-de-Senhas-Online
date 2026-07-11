// Só deixa passar tokens de atendente.
const verificarPerfil = require("./verificarPerfil");

module.exports = verificarPerfil(["atendente"]);