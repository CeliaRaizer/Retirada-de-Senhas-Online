const jwt    = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db     = require("../config/db");

/* =====================================
   LOGIN GOOGLE (OAuth)
===================================== */
exports.callback = (req, res) => {

    const token = jwt.sign(
        req.user,
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
    );

    res.redirect(`http://localhost:5173?token=${token}`);
};

/* =====================================
   LOGIN ADMIN (email + senha com bcrypt)
===================================== */
exports.loginAdmin = async (req, res) => {

    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            mensagem: "Email e senha são obrigatórios"
        });
    }

    // busca SOMENTE por email — nunca comparar senha no SQL
    const sql = `
        SELECT * FROM admins
        WHERE email = ?
        LIMIT 1
    `;

    db.query(sql, [email], async (err, result) => {

        if (err) {
            return res.status(500).json({
                mensagem: "Erro interno"
            });
        }

        // mesmo erro para email inválido e senha errada
        // (evita enumerar usuários)
        if (result.length === 0) {
            return res.status(401).json({
                mensagem: "Email ou senha inválidos"
            });
        }

        const admin = result[0];

        // compara a senha digitada com o hash do banco
        const senhaCorreta = await bcrypt.compare(
            senha,
            admin.senha
        );

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: "Email ou senha inválidos"
            });
        }

        const token = jwt.sign(
            {
                id:     admin.id,
                nome:   admin.nome,
                email:  admin.email,
                perfil: "admin"
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        return res.json({
            mensagem: "Login admin realizado",
            token
        });
    });
};