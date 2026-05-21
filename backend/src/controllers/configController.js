const configModel = require("../models/configModel");

exports.getTempo = async (req, res) => {
    try {
        const tempo = await configModel.getTempo();
        res.json({ tempo_medio_atendimento: tempo });
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
};

exports.setTempo = async (req, res) => {
    try {
        const { minutos } = req.body;
        if (!minutos || isNaN(minutos) || minutos < 1) {
            return res.status(400).json({ erro: "Informe um valor válido em minutos" });
        }
        const resultado = await configModel.setTempo(parseInt(minutos));
        res.json(resultado);
    } catch (err) {
        res.status(500).json({ erro: err.message });
    }
};