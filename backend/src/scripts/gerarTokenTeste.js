require("dotenv").config();
const jwt = require("jsonwebtoken");

const email = process.argv[2] || "cliente.teste@exemplo.com";
const nome  = process.argv[3] || "Cliente Teste";

const usuario = {
    googleId: "teste-" + Date.now(),
    nome,
    email
};

const token = jwt.sign(
    usuario,
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
);

console.log("\nToken de cliente gerado com sucesso!\n");
console.log("Token:", token);
console.log("\nUse no Postman como Bearer Token para testar /api/senha e /api/minha-senha\n");