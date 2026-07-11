const jwt    = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db     = require("../config/db");
const atendenteModel = require("../models/atendenteModel");
const clienteModel = require("../models/clienteModel");

/* =====================================
   LOGIN GOOGLE (OAuth)
===================================== */
exports.callback = async (req, res) => {

    try {
        const { googleId, nome, email } = req.user;

        let cliente = await clienteModel.buscarPorGoogleId(googleId);

        if (!cliente) {
            // Talvez a pessoa já tenha uma conta local (email+senha)
            // com esse mesmo email — nesse caso vinculamos o Google
            // a ela em vez de criar uma conta duplicada.
            const existentePorEmail = await clienteModel.buscarPorEmail(email);

            if (existentePorEmail) {
                await clienteModel.vincularGoogleId(existentePorEmail.id, googleId);
                cliente = existentePorEmail;
            } else {
                cliente = await clienteModel.criarClienteGoogle(nome, email, googleId);
            }
        }

        const token = jwt.sign(
            {
                id:     cliente.id,
                nome:   cliente.nome,
                email:  cliente.email,
                perfil: "cliente"
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.redirect(`http://localhost:5173?token=${token}`);

    } catch (err) {
        console.error("Erro no login Google:", err);
        res.redirect(`http://localhost:5173?erro=login_google_falhou`);
    }
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

/* =====================================
   LOGIN ATENDENTE (email + senha com bcrypt)
===================================== */
exports.loginAtendente = async (req, res) => {

    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            mensagem: "Email e senha são obrigatórios"
        });
    }

    try {
        const atendente = await atendenteModel.buscarPorEmail(email);

        // mesmo erro para email inválido, senha errada ou conta desativada
        // (evita enumerar usuários)
        if (!atendente || !atendente.ativo) {
            return res.status(401).json({
                mensagem: "Email ou senha inválidos"
            });
        }

        const senhaCorreta = await bcrypt.compare(senha, atendente.senha);

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: "Email ou senha inválidos"
            });
        }

        const token = jwt.sign(
            {
                id:     atendente.id,
                nome:   atendente.nome,
                email:  atendente.email,
                perfil: "atendente"
            },
            process.env.JWT_SECRET,
            { expiresIn: "8h" }
        );

        return res.json({
            mensagem: "Login atendente realizado",
            token
        });

    } catch (err) {
        return res.status(500).json({
            mensagem: "Erro interno"
        });
    }
};

/* =====================================
   CADASTRO DE CLIENTE (conta local)
===================================== */
exports.registrarCliente = async (req, res) => {

    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({
            mensagem: "Nome, email e senha são obrigatórios"
        });
    }

    try {
        const existente = await clienteModel.buscarPorEmail(email);

        if (existente) {
            return res.status(409).json({
                mensagem: "Já existe uma conta com esse email"
            });
        }

        const senhaHash = await bcrypt.hash(senha, 12);
        const cliente = await clienteModel.criarCliente(nome, email, senhaHash);

        const token = jwt.sign(
            {
                id:     cliente.id,
                nome:   cliente.nome,
                email:  cliente.email,
                perfil: "cliente"
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(201).json({
            mensagem: "Conta criada com sucesso",
            token
        });

    } catch (err) {
        console.error("Erro ao registrar cliente:", err);
        return res.status(500).json({
            mensagem: "Erro interno"
        });
    }
};

/* =====================================
   LOGIN DE CLIENTE (conta local)
===================================== */
exports.loginCliente = async (req, res) => {

    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({
            mensagem: "Email e senha são obrigatórios"
        });
    }

    try {
        const cliente = await clienteModel.buscarPorEmail(email);

        // mesmo erro para email inválido, senha errada ou conta só-Google
        // (evita enumerar usuários e evita expor que a conta usa Google)
        if (!cliente || !cliente.senha) {
            return res.status(401).json({
                mensagem: "Email ou senha inválidos"
            });
        }

        const senhaCorreta = await bcrypt.compare(senha, cliente.senha);

        if (!senhaCorreta) {
            return res.status(401).json({
                mensagem: "Email ou senha inválidos"
            });
        }

        const token = jwt.sign(
            {
                id:     cliente.id,
                nome:   cliente.nome,
                email:  cliente.email,
                perfil: "cliente"
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.json({
            mensagem: "Login realizado",
            token
        });

    } catch (err) {
        console.error("Erro ao logar cliente:", err);
        return res.status(500).json({
            mensagem: "Erro interno"
        });
    }
};