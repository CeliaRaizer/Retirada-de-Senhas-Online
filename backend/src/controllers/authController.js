const jwt    = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db     = require("../config/db");
const atendenteModel = require("../models/atendenteModel");
const clienteModel = require("../models/clienteModel");
const { enviarEmail } = require("../services/emailService");

const FRONTEND_URL = "http://localhost:5173";
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function gerarToken() {
    return crypto.randomBytes(32).toString("hex");
}

/* =====================================
   LOGIN GOOGLE (OAuth)
===================================== */
exports.callback = async (req, res) => {

    try {
        const { googleId, nome, email, foto } = req.user;

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
                foto:   foto || null,
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

    if (!REGEX_EMAIL.test(email)) {
        return res.status(400).json({
            mensagem: "Informe um email em um formato válido"
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
        const tokenVerificacao = gerarToken();
        const tokenExpira = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

        const cliente = await clienteModel.criarCliente(
            nome, email, senhaHash, tokenVerificacao, tokenExpira
        );

        const linkVerificacao = `http://localhost:3000/auth/cliente/verificar?token=${tokenVerificacao}`;

        await enviarEmail({
            to: email,
            subject: "Confirme seu email — Retirada de Senhas",
            html: `
                <p>Olá, ${nome}!</p>
                <p>Confirme seu email pra ativar sua conta:</p>
                <p><a href="${linkVerificacao}">${linkVerificacao}</a></p>
                <p>Esse link expira em 24 horas.</p>
            `
        });

        // Não devolvemos token de login aqui — a conta só pode ser
        // usada depois que o email for confirmado.
        return res.status(201).json({
            mensagem: "Conta criada! Confirme seu email pra poder entrar (verifique sua caixa de entrada)."
        });

    } catch (err) {
        console.error("Erro ao registrar cliente:", err);
        return res.status(500).json({
            mensagem: "Erro interno"
        });
    }
};

/* =====================================
   VERIFICAR EMAIL (link enviado por email)
===================================== */
exports.verificarEmail = async (req, res) => {
    const { token } = req.query;

    if (!token) {
        return res.redirect(`${FRONTEND_URL}?erro=token_invalido`);
    }

    try {
        const cliente = await clienteModel.buscarPorTokenVerificacao(token);

        if (!cliente) {
            return res.redirect(`${FRONTEND_URL}?erro=token_invalido`);
        }

        await clienteModel.confirmarEmail(cliente.id);

        return res.redirect(`${FRONTEND_URL}?emailVerificado=1`);

    } catch (err) {
        console.error("Erro ao verificar email:", err);
        return res.redirect(`${FRONTEND_URL}?erro=falha_verificacao`);
    }
};

/* =====================================
   REENVIAR EMAIL DE VERIFICAÇÃO
===================================== */
exports.reenviarVerificacao = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ mensagem: "Informe o email" });
    }

    // Mesma resposta genérica em qualquer caso — não revela se a
    // conta existe, se já está verificada, etc.
    const respostaGenerica = {
        mensagem: "Se essa conta existir e ainda não tiver sido confirmada, reenviamos o email de verificação."
    };

    try {
        const cliente = await clienteModel.buscarPorEmail(email);

        if (cliente && !cliente.email_verificado) {
            const tokenVerificacao = gerarToken();
            const tokenExpira = new Date(Date.now() + 24 * 60 * 60 * 1000);

            await clienteModel.salvarTokenVerificacao(cliente.id, tokenVerificacao, tokenExpira);

            const linkVerificacao = `http://localhost:3000/auth/cliente/verificar?token=${tokenVerificacao}`;

            await enviarEmail({
                to: email,
                subject: "Confirme seu email — Retirada de Senhas",
                html: `
                    <p>Olá, ${cliente.nome}!</p>
                    <p>Confirme seu email pra ativar sua conta:</p>
                    <p><a href="${linkVerificacao}">${linkVerificacao}</a></p>
                    <p>Esse link expira em 24 horas.</p>
                `
            });
        }

        return res.json(respostaGenerica);

    } catch (err) {
        console.error("Erro ao reenviar verificação:", err);
        return res.status(500).json({ mensagem: "Erro interno" });
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

        if (!cliente.email_verificado) {
            return res.status(403).json({
                mensagem: "Confirme seu email antes de entrar. Verifique sua caixa de entrada.",
                emailNaoVerificado: true
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

/* =====================================
   SOLICITAR RECUPERAÇÃO DE SENHA
===================================== */
exports.solicitarRecuperacaoSenha = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ mensagem: "Informe o email" });
    }

    // Resposta genérica sempre — não revela se a conta existe
    const respostaGenerica = {
        mensagem: "Se essa conta existir, enviamos um link de recuperação para o email informado."
    };

    try {
        const cliente = await clienteModel.buscarPorEmail(email);

        if (cliente) {
            const tokenReset = gerarToken();
            const tokenExpira = new Date(Date.now() + 60 * 60 * 1000); // 1h

            await clienteModel.salvarTokenReset(cliente.id, tokenReset, tokenExpira);

            const linkReset = `${FRONTEND_URL}/redefinir-senha?token=${tokenReset}`;

            await enviarEmail({
                to: email,
                subject: "Recuperação de senha — Retirada de Senhas",
                html: `
                    <p>Olá, ${cliente.nome}!</p>
                    <p>Clique no link abaixo pra definir uma nova senha:</p>
                    <p><a href="${linkReset}">${linkReset}</a></p>
                    <p>Esse link expira em 1 hora. Se você não pediu isso, ignore este email.</p>
                `
            });
        }

        return res.json(respostaGenerica);

    } catch (err) {
        console.error("Erro ao solicitar recuperação de senha:", err);
        return res.status(500).json({ mensagem: "Erro interno" });
    }
};

/* =====================================
   REDEFINIR SENHA (com token do email)
===================================== */
exports.redefinirSenha = async (req, res) => {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
        return res.status(400).json({ mensagem: "Token e nova senha são obrigatórios" });
    }

    try {
        const cliente = await clienteModel.buscarPorTokenReset(token);

        if (!cliente) {
            return res.status(400).json({
                mensagem: "Link inválido ou expirado. Solicite a recuperação novamente."
            });
        }

        const senhaHash = await bcrypt.hash(novaSenha, 12);
        await clienteModel.redefinirSenha(cliente.id, senhaHash);

        return res.json({ mensagem: "Senha redefinida com sucesso! Você já pode entrar." });

    } catch (err) {
        console.error("Erro ao redefinir senha:", err);
        return res.status(500).json({ mensagem: "Erro interno" });
    }
};