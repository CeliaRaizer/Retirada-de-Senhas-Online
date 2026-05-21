const bcrypt = require("bcrypt");

const senha = process.argv[2];

if (!senha) {
    console.error("Informe a senha como argumento.");
    console.error("Exemplo: node scripts/gerarHashSenha.js MinhaSenh@123");
    process.exit(1);
}

bcrypt.hash(senha, 12).then((hash) => {
    console.log("\nHash gerado com sucesso!\n");
    console.log("Hash:", hash);
    console.log("\nCole no banco com o comando SQL:");
    console.log(`UPDATE admins SET senha = '${hash}' WHERE email = 'SEU_EMAIL_AQUI';\n`);
});