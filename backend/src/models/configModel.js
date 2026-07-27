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

/* =====================================
   HORÁRIOS (atendimento e retirada de senhas)
===================================== */
const CHAVES_HORARIO = {
    atendimentoInicio: "horario_atendimento_inicio",
    atendimentoFim:    "horario_atendimento_fim",
    senhasInicio:      "horario_senhas_inicio",
    senhasFim:         "horario_senhas_fim",
    dias:              "dias_atendimento",
};

const PADRAO_HORARIO = {
    atendimentoInicio: "08:00",
    atendimentoFim:    "18:00",
    senhasInicio:      "08:00",
    senhasFim:         "17:00",
    dias:              [1, 2, 3, 4, 5], // segunda a sexta (0 = domingo ... 6 = sábado)
};

function buscarValor(chave) {
    return new Promise((resolve, reject) => {
        db.query("SELECT valor FROM configuracoes WHERE chave = ?", [chave], (err, rows) => {
            if (err) return reject(err);
            resolve(rows.length > 0 ? rows[0].valor : null);
        });
    });
}

// Atualiza a chave se ela já existir; cria se ainda não existir
// (evita depender de a tabela `configuracoes` já ter a linha pré-cadastrada).
function upsertValor(chave, valor) {
    return new Promise((resolve, reject) => {
        db.query("UPDATE configuracoes SET valor = ? WHERE chave = ?", [valor, chave], (err, result) => {
            if (err) return reject(err);
            if (result.affectedRows > 0) return resolve();
            db.query("INSERT INTO configuracoes (chave, valor) VALUES (?, ?)", [chave, valor], (err2) => {
                if (err2) return reject(err2);
                resolve();
            });
        });
    });
}

exports.getHorarios = async () => {
    const [atendimentoInicio, atendimentoFim, senhasInicio, senhasFim, diasCsv] = await Promise.all([
        buscarValor(CHAVES_HORARIO.atendimentoInicio),
        buscarValor(CHAVES_HORARIO.atendimentoFim),
        buscarValor(CHAVES_HORARIO.senhasInicio),
        buscarValor(CHAVES_HORARIO.senhasFim),
        buscarValor(CHAVES_HORARIO.dias),
    ]);

    const dias = diasCsv
        ? diasCsv.split(",").map(n => parseInt(n, 10)).filter(n => !isNaN(n))
        : PADRAO_HORARIO.dias;

    return {
        atendimentoInicio: atendimentoInicio || PADRAO_HORARIO.atendimentoInicio,
        atendimentoFim:    atendimentoFim    || PADRAO_HORARIO.atendimentoFim,
        senhasInicio:      senhasInicio      || PADRAO_HORARIO.senhasInicio,
        senhasFim:         senhasFim         || PADRAO_HORARIO.senhasFim,
        diasAtendimento:   dias.length > 0 ? dias : PADRAO_HORARIO.dias,
    };
};

exports.setHorarios = async ({ atendimentoInicio, atendimentoFim, senhasInicio, senhasFim, diasAtendimento }) => {
    await Promise.all([
        upsertValor(CHAVES_HORARIO.atendimentoInicio, atendimentoInicio),
        upsertValor(CHAVES_HORARIO.atendimentoFim,    atendimentoFim),
        upsertValor(CHAVES_HORARIO.senhasInicio,      senhasInicio),
        upsertValor(CHAVES_HORARIO.senhasFim,         senhasFim),
        upsertValor(CHAVES_HORARIO.dias,              diasAtendimento.join(",")),
    ]);
    return { mensagem: "Horários atualizados com sucesso" };
};