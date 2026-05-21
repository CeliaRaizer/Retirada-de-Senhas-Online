const db = require("../config/db");

exports.getTempo = () => {
    return new Promise((resolve, reject) => {
        db.query("SELECT valor FROM configuracoes WHERE chave = 'tempo_medio_atendimento'", (err, result) => {
            if (err) return reject(err);
            resolve(result.length > 0 ? parseInt(result[0].valor) : 5);
        });
    });
};

exports.setTempo = (minutos) => {
    return new Promise((resolve, reject) => {
        db.query(
            "UPDATE configuracoes SET valor = ? WHERE chave = 'tempo_medio_atendimento'",
            [minutos],
            (err) => {
                if (err) return reject(err);
                resolve({ mensagem: `Tempo atualizado para ${minutos} minutos` });
            }
        );
    });
};