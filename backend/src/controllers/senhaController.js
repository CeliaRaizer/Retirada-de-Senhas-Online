const model = require("../models/senhaModel");

/* =====================================
   CRIAR SENHA
===================================== */
exports.criar = async (req, res) => {
    try {
        const { tipo } = req.body;
        const usuario = req.usuario;

        if (!tipo || !["normal", "prioritario"].includes(tipo)) {
            return res.status(400).json({ erro: "Tipo de senha inválido" });
        }

        const senha = await model.criarSenha(tipo, usuario.email);

        const io = req.app.get("io");
        io.emit("filaAtualizada");

        return res.status(201).json(senha);

    } catch (err) {
        console.error("Erro ao criar senha:", err);
        return res.status(500).json({
            erro: err.message || "Erro ao criar senha"
        });
    }
};

/* =====================================
   LISTAR TODAS (dia atual)
===================================== */
exports.listar = async (req, res) => {
    try {
        const senhas = await model.listarSenhas();
        res.json(senhas);
    } catch (err) {
        console.error("Erro ao listar senhas:", err);
        res.status(500).json({ erro: "Erro ao listar senhas" });
    }
};

/* =====================================
   CHAMAR PRÓXIMA
===================================== */
exports.chamar = async (req, res) => {
    try {
        const atendenteId = req.usuario?.perfil === "atendente" ? req.usuario.id : null;
        const senha = await model.chamarProxima(atendenteId);

        const io = req.app.get("io");
        io.emit("senhaChamada", senha);
        io.emit("filaAtualizada");

        res.json(senha);

    } catch (err) {
        console.error("Erro ao chamar próxima senha:", err);
        res.status(500).json({ erro: "Erro ao chamar próxima senha" });
    }
};

/* =====================================
   FINALIZAR SENHA
===================================== */
exports.finalizar = async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await model.finalizarSenha(id);

        const io = req.app.get("io");
        io.emit("filaAtualizada");

        res.json(resultado);

    } catch (err) {
        console.error("Erro ao finalizar senha:", err);
        res.status(500).json({ erro: "Erro ao finalizar senha" });
    }
};

/* =====================================
   CANCELAR SENHA (ADMIN)
===================================== */
exports.cancelar = async (req, res) => {
    try {
        const { id } = req.params;

        const resultado = await model.cancelarSenha(id);

        const io = req.app.get("io");
        io.emit("filaAtualizada");

        res.json(resultado);

    } catch (err) {
        console.error("Erro ao cancelar senha:", err);
        res.status(500).json({ erro: "Erro ao cancelar senha" });
    }
};

/* =====================================
   MINHA SENHA (Cliente)
===================================== */
exports.minhaSenha = async (req, res) => {
    try {
        const email = req.usuario.email;
        const resultado = await model.buscarMinhaSenha(email);

        res.json(resultado);

    } catch (err) {
        console.error("Erro ao buscar minha senha:", err);
        res.status(500).json({ erro: "Erro ao buscar sua senha" });
    }
};

/* =====================================
   CANCELAR MINHA SENHA
===================================== */
exports.cancelarMinhaSenha = async (req, res) => {
    try {
        const email = req.usuario.email;

        const resultado = await model.cancelarMinhaSenha(email);

        const io = req.app.get("io");
        io.emit("filaAtualizada");

        res.json(resultado);

    } catch (err) {
        console.error("Erro ao cancelar minha senha:", err);
        res.status(500).json({ erro: err.message || "Erro ao cancelar senha" });
    }
};

/* =====================================
   RESETAR FILA (ADMIN) - FINAL DO DIA
===================================== */
exports.resetarFila = async (req, res) => {
    try {
        const resultado = await model.resetarFila();

        const io = req.app.get("io");
        io.emit("fila_resetada");
        io.emit("filaAtualizada");

        res.json({
            success: true,
            message: "Fila resetada com sucesso! Um novo dia foi iniciado.",
            ...resultado
        });

    } catch (err) {
        console.error("Erro ao resetar fila:", err);
        res.status(500).json({ 
            erro: "Erro ao resetar a fila",
            detalhe: err.message 
        });
    }
};

/* =====================================
   FILA PÚBLICA (Telaão / Cliente)
===================================== */
exports.filaPublica = async (req, res) => {
    try {
        const dados = await model.buscarFilaPublica();
        res.json(dados);
    } catch (err) {
        console.error("Erro ao buscar fila pública:", err);
        res.status(500).json({ erro: "Erro ao carregar fila pública" });
    }
};

/* =====================================
   HISTÓRICO POR DATA (ADMIN)
===================================== */
exports.historicoPorData = async (req, res) => {
    try {
        const { data } = req.query; // Ex: ?data=2026-05-20

        const resultado = await model.historicoPorData(data);

        res.json(resultado);

    } catch (err) {
        console.error("Erro ao buscar histórico:", err);
        res.status(500).json({ 
            erro: "Erro ao buscar histórico por data",
            detalhe: err.message 
        });
    }
};