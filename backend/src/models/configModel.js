const db = require("../config/db");

const MAX_DIAS_BUSCA = 14;
const MINUTOS_PADRAO_SEM_DADOS = 5; // só usado se não houver NENHUM dia com dados no período de busca
const CHAVE_OVERRIDE = "tempo_override_minutos";

function calcularMediaDiaAnterior() {
    return new Promise((resolve, reject) => {
        db.query(
            `SELECT dia_referencia, AVG(TIMESTAMPDIFF(MINUTE, chamado_em, finalizado_em)) AS media, COUNT(*) AS amostras
             FROM senha
             WHERE status = 'atendido'
               AND chamado_em IS NOT NULL
               AND finalizado_em IS NOT NULL
               AND dia_referencia < CURDATE()
               AND dia_referencia >= CURDATE() - INTERVAL ? DAY
             GROUP BY dia_referencia
             ORDER BY dia_referencia DESC
             LIMIT 1`,
            [MAX_DIAS_BUSCA],
            (err, rows) => {
                if (err) return reject(err);
                if (rows.length === 0) {
                    return resolve({ minutos: null, amostras: 0, dia: null });
                }
                const linha = rows[0];
                resolve({
                    minutos: Math.max(1, Math.round(Number(linha.media))),
                    amostras: Number(linha.amostras),
                    dia: linha.dia_referencia ? new Date(linha.dia_referencia).toISOString().slice(0, 10) : null,
                });
            }
        );
    });
}

function buscarOverride() {
    return new Promise((resolve, reject) => {
        db.query("SELECT valor FROM configuracoes WHERE chave = ?", [CHAVE_OVERRIDE], (err, rows) => {
            if (err) return reject(err);
            if (rows.length === 0 || rows[0].valor === "" || rows[0].valor === null) return resolve(null);
            const num = parseInt(rows[0].valor, 10);
            resolve(isNaN(num) ? null : num);
        });
    });
}

// Usado internamente (cálculo do tempo estimado de espera na fila) — só o número final em minutos.
exports.getTempo = async () => {
    const override = await buscarOverride();
    if (override !== null) return override;

    const automatico = await calcularMediaDiaAnterior();
    return automatico.minutos !== null ? automatico.minutos : MINUTOS_PADRAO_SEM_DADOS;
};

// Usado pela tela de Configurações — mostra o valor em uso, de onde ele vem,
// e o cálculo automático de referência (mesmo quando o ajuste manual está ativo).
exports.getTempoDetalhado = async () => {
    const [override, automatico] = await Promise.all([buscarOverride(), calcularMediaDiaAnterior()]);

    const automaticoInfo = {
        minutos: automatico.minutos !== null ? automatico.minutos : MINUTOS_PADRAO_SEM_DADOS,
        calculado: automatico.minutos !== null,
        amostras: automatico.amostras,
        dia: automatico.dia,
    };

    return {
        tempo_medio_atendimento: override !== null ? override : automaticoInfo.minutos,
        overrideAtivo: override !== null,
        overrideMinutos: override,
        automatico: automaticoInfo,
    };
};

// minutos = número -> ativa/atualiza o ajuste manual
// minutos = null    -> remove o ajuste manual e volta a usar o cálculo automático
exports.setOverride = (minutos) => {
    return new Promise((resolve, reject) => {
        if (minutos === null) {
            db.query("DELETE FROM configuracoes WHERE chave = ?", [CHAVE_OVERRIDE], (err) => {
                if (err) return reject(err);
                resolve({ mensagem: "Voltou a usar o cálculo automático." });
            });
        } else {
            db.query(
                "INSERT INTO configuracoes (chave, valor) VALUES (?, ?) ON DUPLICATE KEY UPDATE valor = VALUES(valor)",
                [CHAVE_OVERRIDE, String(minutos)],
                (err) => {
                    if (err) return reject(err);
                    resolve({ mensagem: `Ajuste manual definido: ${minutos} minutos.` });
                }
            );
        }
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