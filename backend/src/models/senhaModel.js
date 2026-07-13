const db = require("../config/db");
const configModel = require("./configModel");
const crypto = require("crypto");

let contadorPrioritarias = 0;

/* ===================================================
   CRIAR SENHA
=================================================== */
exports.criarSenha = (tipo, email) => {
    return new Promise((resolve, reject) => {
        const prefixo = tipo === "prioritario" ? "P" : "N";
        const codigoAcesso = gerarCodigoAcesso();

        db.getConnection((err, connection) => {
            if (err) return reject(err);

            connection.beginTransaction(err => {
                if (err) { connection.release(); return reject(err); }

                const sqlUltima = `
                    SELECT numero FROM senha 
                    WHERE tipo = ? 
                      AND dia_referencia = CURDATE()
                    ORDER BY id DESC LIMIT 1
                    FOR UPDATE
                `;

                connection.query(sqlUltima, [tipo], (err, result) => {
                    if (err) {
                        return connection.rollback(() => { connection.release(); reject(err); });
                    }

                    let proximo = 1;
                    if (result.length > 0 && result[0].numero) {
                        proximo = parseInt(result[0].numero.substring(1)) + 1;
                    }

                    const numeroFormatado = prefixo + String(proximo).padStart(3, "0");

                    const sqlInsert = `
                        INSERT INTO senha 
                        (numero, tipo, status, email_usuario, data, dia_referencia, codigo_acesso)
                        VALUES (?, ?, 'esperando', ?, CURDATE(), CURDATE(), ?)
                    `;

                    connection.query(sqlInsert, [numeroFormatado, tipo, email || null, codigoAcesso], (err, insertResult) => {
                        if (err) {
                            return connection.rollback(() => { connection.release(); reject(err); });
                        }

                        connection.commit(err => {
                            connection.release();
                            if (err) return reject(err);

                            resolve({
                                id: insertResult.insertId,
                                numero: numeroFormatado,
                                tipo,
                                status: "esperando",
                                email_usuario: email,
                                codigoAcesso
                            });
                        });
                    });
                });
            });
        });
    });
};

/* ===================================================
   CRIAR SENHA ANÔNIMA (sem login)
   Gera um código de acesso pra pessoa conseguir
   consultar o status depois, sem precisar de conta.
=================================================== */
function gerarCodigoAcesso() {
    // 6 caracteres, letras maiúsculas + números (ex: "A3F9K1")
    return crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 6);
}

exports.criarSenhaAnonima = (tipo, dispositivoId) => {
    return new Promise((resolve, reject) => {
        const prefixo = tipo === "prioritario" ? "P" : "N";
        const codigoAcesso = gerarCodigoAcesso();

        db.getConnection((err, connection) => {
            if (err) return reject(err);

            connection.beginTransaction(err => {
                if (err) { connection.release(); return reject(err); }

                // Checa, dentro da MESMA transação, se esse dispositivo já
                // tem uma senha ativa hoje. O FOR UPDATE trava a checagem
                // até a transação terminar, então duas requisições quase
                // simultâneas do mesmo dispositivo não conseguem "passar
                // pela brecha" e criar duas senhas ao mesmo tempo.
                const sqlDispositivo = `
                    SELECT id, numero, tipo, status, codigo_acesso
                    FROM senha
                    WHERE dispositivo_id = ?
                      AND dia_referencia = CURDATE()
                      AND status IN ('esperando', 'chamando')
                    LIMIT 1
                    FOR UPDATE
                `;

                connection.query(sqlDispositivo, [dispositivoId], (err, senhasAtivas) => {
                    if (err) {
                        return connection.rollback(() => { connection.release(); reject(err); });
                    }

                    if (senhasAtivas.length > 0) {
                        const existente = senhasAtivas[0];
                        return connection.rollback(() => {
                            connection.release();
                            resolve({
                                jaExiste: true,
                                senha: {
                                    id: existente.id,
                                    numero: existente.numero,
                                    tipo: existente.tipo,
                                    status: existente.status,
                                    codigoAcesso: existente.codigo_acesso
                                }
                            });
                        });
                    }

                    const sqlUltima = `
                        SELECT numero FROM senha 
                        WHERE tipo = ? 
                          AND dia_referencia = CURDATE()
                        ORDER BY id DESC LIMIT 1
                        FOR UPDATE
                    `;

                    connection.query(sqlUltima, [tipo], (err, result) => {
                        if (err) {
                            return connection.rollback(() => { connection.release(); reject(err); });
                        }

                        let proximo = 1;
                        if (result.length > 0 && result[0].numero) {
                            proximo = parseInt(result[0].numero.substring(1)) + 1;
                        }

                        const numeroFormatado = prefixo + String(proximo).padStart(3, "0");

                        const sqlInsert = `
                            INSERT INTO senha 
                            (numero, tipo, status, data, dia_referencia, codigo_acesso, dispositivo_id)
                            VALUES (?, ?, 'esperando', CURDATE(), CURDATE(), ?, ?)
                        `;

                        connection.query(sqlInsert, [numeroFormatado, tipo, codigoAcesso, dispositivoId], (err, insertResult) => {
                            if (err) {
                                return connection.rollback(() => { connection.release(); reject(err); });
                            }

                            connection.commit(err => {
                                connection.release();
                                if (err) return reject(err);

                                resolve({
                                    jaExiste: false,
                                    senha: {
                                        id: insertResult.insertId,
                                        numero: numeroFormatado,
                                        tipo,
                                        status: "esperando",
                                        codigoAcesso
                                    }
                                });
                            });
                        });
                    });
                });
            });
        });
    });
};

/* ===================================================
   CONSULTAR STATUS POR CÓDIGO (sem login)
=================================================== */
exports.buscarPorCodigo = (numero, codigoAcesso) => {
    return new Promise(async (resolve, reject) => {
        try {
            const [result] = await db.promise().query(`
                SELECT * FROM senha
                WHERE numero = ?
                  AND codigo_acesso = ?
                  AND dia_referencia = CURDATE()
                LIMIT 1
            `, [numero, codigoAcesso]);

            if (result.length === 0) {
                return resolve(null);
            }

            const minha = result[0];

            let pessoasNaFrente = 0;

            if (minha.status === "esperando") {
                if (minha.tipo === "prioritario") {
                    const [priorResult] = await db.promise().query(`
                        SELECT COUNT(*) as total FROM senha
                        WHERE status = 'esperando'
                          AND dia_referencia = CURDATE()
                          AND tipo = 'prioritario'
                          AND id < ?
                    `, [minha.id]);
                    pessoasNaFrente = priorResult[0].total;
                } else {
                    const [normalResult] = await db.promise().query(`
                        SELECT COUNT(*) as total FROM senha
                        WHERE status = 'esperando'
                          AND dia_referencia = CURDATE()
                          AND (tipo = 'prioritario' OR (tipo = 'normal' AND id < ?))
                    `, [minha.id]);
                    pessoasNaFrente = normalResult[0].total;
                }
            }

            const tempoPorPessoa = await configModel.getTempo();
            const tempoEstimadoMinutos = pessoasNaFrente * tempoPorPessoa;

            resolve({ ...minha, pessoasNaFrente, tempoEstimadoMinutos });

        } catch (err) {
            reject(err);
        }
    });
};


exports.listarSenhas = () => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT * FROM senha 
            WHERE dia_referencia = CURDATE()
            ORDER BY id ASC
        `;
        db.query(sql, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

/* ===================================================
   CHAMAR PRÓXIMA (Regra 3x1)
   - atendenteId: quem está chamando (obrigatório quando logado
     como atendente; pode vir null em cenários antigos/teste)
=================================================== */
exports.chamarProxima = (atendenteId = null) => {
    return new Promise((resolve, reject) => {

        // Finaliza automaticamente APENAS a senha que esse mesmo
        // atendente estava chamando — não mexe nas senhas de outros
        // guichês/atendentes. Isso é o que permite múltiplos atendentes
        // operando a fila ao mesmo tempo sem um "roubar" o atendimento do outro.
        const sqlFinalizarAnterior = `
            UPDATE senha 
            SET status = 'atendido' 
            WHERE status = 'chamando' 
              AND dia_referencia = CURDATE()
              AND (atendente_id <=> ?)
        `;

        db.query(sqlFinalizarAnterior, [atendenteId], (err) => {
            if (err) return reject(err);

            let sqlBusca = "";

            if (contadorPrioritarias < 3) {
                sqlBusca = `
                    SELECT * FROM senha
                    WHERE status = 'esperando' 
                      AND dia_referencia = CURDATE()
                    ORDER BY 
                        CASE WHEN tipo = 'prioritario' THEN 1 ELSE 2 END,
                        id ASC
                    LIMIT 1
                `;
            } else {
                sqlBusca = `
                    SELECT * FROM senha
                    WHERE status = 'esperando' 
                      AND dia_referencia = CURDATE()
                    ORDER BY 
                        CASE WHEN tipo = 'normal' THEN 1 ELSE 2 END,
                        id ASC
                    LIMIT 1
                `;
            }

            db.query(sqlBusca, (err, result) => {
                if (err) return reject(err);
                if (result.length === 0) {
                    return resolve({ mensagem: "Nenhuma senha na fila" });
                }

                const senha = result[0];

                db.query(
                    `UPDATE senha SET status = 'chamando', atendente_id = ? WHERE id = ?`,
                    [atendenteId, senha.id],
                    (err) => {
                        if (err) return reject(err);

                        senha.status = "chamando";
                        senha.atendente_id = atendenteId;

                        if (senha.tipo === "prioritario") contadorPrioritarias++;
                        else contadorPrioritarias = 0;

                        resolve(senha);
                    }
                );
            });
        });
    });
};

/* ===================================================
   FINALIZAR SENHA
=================================================== */
exports.finalizarSenha = (id) => {
    return new Promise((resolve, reject) => {
        db.query(`UPDATE senha SET status = 'atendido' WHERE id = ?`, [id], (err) => {
            if (err) return reject(err);
            resolve({ mensagem: "Senha finalizada" });
        });
    });
};

/* ===================================================
   CANCELAR SENHA (admin)
=================================================== */
exports.cancelarSenha = (id) => {
    return new Promise((resolve, reject) => {
        db.query(`UPDATE senha SET status = 'cancelado' WHERE id = ?`, [id], (err) => {
            if (err) return reject(err);
            resolve({ mensagem: "Senha cancelada" });
        });
    });
};

/* ===================================================
   CANCELAR MINHA SENHA (cliente)
=================================================== */
exports.cancelarMinhaSenha = (email) => {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE senha 
            SET status = 'cancelado' 
            WHERE email_usuario = ? 
              AND status IN ('esperando', 'chamando')
              AND dia_referencia = CURDATE()
        `;

        db.query(sql, [email], (err, result) => {
            if (err) return reject(err);
            resolve({
                mensagem: result.affectedRows > 0
                    ? "Senha cancelada com sucesso"
                    : "Nenhuma senha ativa encontrada"
            });
        });
    });
};

/* ===================================================
   BUSCAR MINHA SENHA (cliente)
=================================================== */
exports.buscarMinhaSenha = (email) => {
    return new Promise(async (resolve, reject) => {
        try {
            const [result] = await db.promise().query(`
                SELECT * FROM senha
                WHERE email_usuario = ?
                  AND status IN ('esperando', 'chamando')
                  AND dia_referencia = CURDATE()
                LIMIT 1
            `, [email]);

            if (result.length === 0) {
                return resolve({ mensagem: "Você não possui senha ativa hoje." });
            }

            const minha = result[0];

            let pessoasNaFrente;

            if (minha.tipo === 'prioritario') {
                const [priorResult] = await db.promise().query(`
                    SELECT COUNT(*) as total FROM senha
                    WHERE status = 'esperando'
                      AND dia_referencia = CURDATE()
                      AND tipo = 'prioritario'
                      AND id < ?
                `, [minha.id]);
                pessoasNaFrente = priorResult[0].total;
            } else {
                const [normalResult] = await db.promise().query(`
                    SELECT COUNT(*) as total FROM senha
                    WHERE status = 'esperando'
                      AND dia_referencia = CURDATE()
                      AND (tipo = 'prioritario' OR (tipo = 'normal' AND id < ?))
                `, [minha.id]);
                pessoasNaFrente = normalResult[0].total;
            }

            const tempoPorPessoa = await configModel.getTempo();
            const tempoEstimadoMinutos = pessoasNaFrente * tempoPorPessoa;

            resolve({ ...minha, pessoasNaFrente, tempoEstimadoMinutos, codigoAcesso: minha.codigo_acesso });

        } catch (err) {
            reject(err);
        }
    });
};

/* ===================================================
   CANCELAR POR CÓDIGO (visitante sem login)
=================================================== */
exports.cancelarPorCodigo = (numero, codigoAcesso) => {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE senha 
            SET status = 'cancelado' 
            WHERE numero = ? 
              AND codigo_acesso = ?
              AND dia_referencia = CURDATE()
              AND status IN ('esperando', 'chamando')
        `;
        db.query(sql, [numero, codigoAcesso], (err, result) => {
            if (err) return reject(err);
            resolve({
                mensagem: result.affectedRows > 0
                    ? "Senha cancelada com sucesso"
                    : "Senha não encontrada ou já finalizada"
            });
        });
    });
};

/* ===================================================
   HISTÓRICO DO CLIENTE LOGADO
   Últimos atendimentos (atendido/cancelado) desse email,
   sem incluir a senha ativa do dia de hoje.
=================================================== */
exports.buscarHistoricoCliente = (email) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT id, numero, tipo, status, data
            FROM senha
            WHERE email_usuario = ?
              AND status IN ('atendido', 'cancelado')
            ORDER BY id DESC
            LIMIT 20
        `;
        db.query(sql, [email], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

/* ===================================================
   RESETAR FILA - FINAL DO DIA
=================================================== */
exports.resetarFila = () => {
    return new Promise((resolve, reject) => {

        // Cancela apenas as pendentes — não toca em data nenhuma
        const sql = `
            UPDATE senha 
            SET status = 'cancelado' 
            WHERE dia_referencia = CURDATE()
              AND status IN ('esperando', 'chamando')
        `;

        db.query(sql, (err, result) => {
            if (err) return reject(err);

            contadorPrioritarias = 0;

            resolve({
                success: true,
                message: "Fila resetada com sucesso! Novo dia iniciado.",
                canceladas: result.affectedRows
            });
        });
    });
};

/* ===================================================
   FILA PÚBLICA (telão / cliente)
=================================================== */
exports.buscarFilaPublica = () => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT id, numero, tipo, status 
            FROM senha 
            WHERE status IN ('esperando', 'chamando')
              AND dia_referencia = CURDATE()
            ORDER BY 
                CASE WHEN status = 'chamando' THEN 0 ELSE 1 END,
                id ASC
        `;

        db.query(sql, (err, result) => {
            if (err) return reject(err);

            const chamando = result.find(s => s.status === 'chamando') || null;
            const fila = result.filter(s => s.status === 'esperando');

            resolve({
                chamando,
                totalNaFila: fila.length,
                fila
            });
        });
    });
};

/* ===================================================
   HISTÓRICO POR DATA (usa `data` real — imutável)
=================================================== */
exports.historicoPorData = (data) => {
    return new Promise((resolve, reject) => {

        const dataConsulta = data || new Date().toISOString().split('T')[0];

        const sql = `
            SELECT 
                id,
                numero,
                tipo,
                status,
                email_usuario,
                data,
                dia_referencia
            FROM senha 
            WHERE data = ?
            ORDER BY id ASC
        `;

        db.query(sql, [dataConsulta], (err, senhas) => {
            if (err) return reject(err);

            const total = senhas.length;
            const atendidos = senhas.filter(s => s.status === 'atendido').length;
            const cancelados = senhas.filter(s => s.status === 'cancelado').length;
            const esperando = senhas.filter(s => s.status === 'esperando').length;
            const chamando = senhas.filter(s => s.status === 'chamando').length;

            resolve({
                data: dataConsulta,
                total,
                atendidos,
                cancelados,
                esperando,
                chamando,
                senhas
            });
        });
    });
};