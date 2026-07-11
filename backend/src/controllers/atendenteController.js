const bcrypt = require("bcrypt");
const model = require("../models/atendenteModel");

/* =====================================
   CRIAR ATENDENTE (admin)
===================================== */
exports.criar = async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                mensagem: "Nome, email e senha são obrigatórios"
            });
        }

        const existente = await model.buscarPorEmail(email);
        if (existente) {
            return res.status(409).json({
                mensagem: "Já existe um atendente com esse email"
            });
        }

        const senhaHash = await bcrypt.hash(senha, 12);
        const criadoPor = req.usuario.id; // admin logado

        const atendente = await model.criarAtendente(nome, email, senhaHash, criadoPor);

        return res.status(201).json(atendente);

    } catch (err) {
        console.error("Erro ao criar atendente:", err);
        return res.status(500).json({ mensagem: "Erro ao criar atendente" });
    }
};

/* =====================================
   LISTAR ATENDENTES (admin)
===================================== */
exports.listar = async (req, res) => {
    try {
        const atendentes = await model.listarAtendentes();
        res.json(atendentes);
    } catch (err) {
        console.error("Erro ao listar atendentes:", err);
        res.status(500).json({ mensagem: "Erro ao listar atendentes" });
    }
};

/* =====================================
   ATUALIZAR ATENDENTE (nome / email / ativo)
===================================== */
exports.atualizar = async (req, res) => {
    try {
        const { id } = req.params;
        const { nome, email, ativo } = req.body;

        const resultado = await model.atualizarAtendente(id, { nome, email, ativo });
        res.json(resultado);

    } catch (err) {
        console.error("Erro ao atualizar atendente:", err);
        res.status(500).json({ mensagem: "Erro ao atualizar atendente" });
    }
};

/* =====================================
   RESETAR SENHA DO ATENDENTE (admin)
===================================== */
exports.resetarSenha = async (req, res) => {
    try {
        const { id } = req.params;
        const { novaSenha } = req.body;

        if (!novaSenha) {
            return res.status(400).json({ mensagem: "Informe a nova senha" });
        }

        const senhaHash = await bcrypt.hash(novaSenha, 12);
        const resultado = await model.atualizarSenha(id, senhaHash);
        res.json(resultado);

    } catch (err) {
        console.error("Erro ao resetar senha do atendente:", err);
        res.status(500).json({ mensagem: "Erro ao resetar senha" });
    }
};

/* =====================================
   DESATIVAR ATENDENTE (soft delete)
===================================== */
exports.desativar = async (req, res) => {
    try {
        const { id } = req.params;
        const resultado = await model.desativarAtendente(id);
        res.json(resultado);
    } catch (err) {
        console.error("Erro ao desativar atendente:", err);
        res.status(500).json({ mensagem: "Erro ao desativar atendente" });
    }
};