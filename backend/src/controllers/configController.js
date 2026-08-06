const configModel = require("../models/configModel");

exports.getTempo = async (req, res) => {
    try {
        const tempo = await configModel.getTempoDetalhado();
        res.json(tempo);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
};


exports.setTempo = async (req, res) => {
    try {
        const { minutos } = req.body;

        if (minutos === null || minutos === undefined || minutos === "") {
            const resultado = await configModel.setOverride(null);
            return res.json(resultado);
        }

        const valor = parseInt(minutos, 10);
        if (isNaN(valor) || valor < 1 || valor > 180) {
            return res.status(400).json({ erro: "Informe um valor válido em minutos (1 a 180), ou nenhum valor para voltar ao automático." });
        }

        const resultado = await configModel.setOverride(valor);
        res.json(resultado);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
};

/* =====================================
   HORÁRIOS (atendimento e retirada de senhas)
===================================== */
const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

exports.getHorarios = async (req, res) => {
    try {
        const horarios = await configModel.getHorarios();
        res.json(horarios);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
};

exports.setHorarios = async (req, res) => {
    try {
        const { atendimentoInicio, atendimentoFim, senhasInicio, senhasFim, diasAtendimento } = req.body;
        const campos = { atendimentoInicio, atendimentoFim, senhasInicio, senhasFim };

        for (const [campo, valor] of Object.entries(campos)) {
            if (!valor || !HHMM.test(valor)) {
                return res.status(400).json({ erro: `Horário inválido em "${campo}". Use o formato HH:MM.` });
            }
        }
        if (atendimentoInicio >= atendimentoFim) {
            return res.status(400).json({ erro: "O horário final do atendimento precisa ser depois do horário inicial." });
        }
        if (senhasInicio >= senhasFim) {
            return res.status(400).json({ erro: "O horário final de retirada de senhas precisa ser depois do horário inicial." });
        }

        if (
            !Array.isArray(diasAtendimento) ||
            diasAtendimento.length === 0 ||
            diasAtendimento.some(d => !Number.isInteger(d) || d < 0 || d > 6)
        ) {
            return res.status(400).json({ erro: "Selecione ao menos um dia de atendimento válido." });
        }

        const resultado = await configModel.setHorarios({ ...campos, diasAtendimento });
        res.json(resultado);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
};