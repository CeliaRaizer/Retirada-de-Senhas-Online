const db = require("../config/db");

/* ===================================================
   CRIAR CLIENTE (cadastro local)
   Nasce com email_verificado = 0 até clicar no link
   enviado por email.
=================================================== */
exports.criarCliente = (nome, email, senhaHash, tokenVerificacao, tokenExpira) => {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO clientes 
            (nome, email, senha, email_verificado, token_verificacao, token_verificacao_expira)
            VALUES (?, ?, ?, 0, ?, ?)
        `;
        db.query(sql, [nome, email, senhaHash, tokenVerificacao, tokenExpira], (err, result) => {
            if (err) return reject(err);
            resolve({
                id: result.insertId,
                nome,
                email
            });
        });
    });
};

/* ===================================================
   BUSCAR POR EMAIL (login, cadastro, recuperação)
=================================================== */
exports.buscarPorEmail = (email) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM clientes WHERE email = ? LIMIT 1`;
        db.query(sql, [email], (err, result) => {
            if (err) return reject(err);
            resolve(result[0] || null);
        });
    });
};

/* ===================================================
   BUSCAR POR GOOGLE ID (login Google)
=================================================== */
exports.buscarPorGoogleId = (googleId) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM clientes WHERE google_id = ? LIMIT 1`;
        db.query(sql, [googleId], (err, result) => {
            if (err) return reject(err);
            resolve(result[0] || null);
        });
    });
};

/* ===================================================
   VINCULAR GOOGLE ID A UMA CONTA JÁ EXISTENTE
   O Google já confirma a posse do email, então
   aproveitamos e marcamos como verificado também.
=================================================== */
exports.vincularGoogleId = (id, googleId) => {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE clientes SET google_id = ?, email_verificado = 1 WHERE id = ?`;
        db.query(sql, [googleId, id], (err, result) => {
            if (err) return reject(err);
            resolve({ mensagem: "Google vinculado", afetados: result.affectedRows });
        });
    });
};

/* ===================================================
   CRIAR CLIENTE VIA GOOGLE (sem senha local, já
   nasce com email verificado)
=================================================== */
exports.criarClienteGoogle = (nome, email, googleId) => {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO clientes (nome, email, google_id, email_verificado)
            VALUES (?, ?, ?, 1)
        `;
        db.query(sql, [nome, email, googleId], (err, result) => {
            if (err) return reject(err);
            resolve({
                id: result.insertId,
                nome,
                email
            });
        });
    });
};

/* ===================================================
   VERIFICAÇÃO DE EMAIL
=================================================== */
exports.buscarPorTokenVerificacao = (token) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT * FROM clientes 
            WHERE token_verificacao = ? 
              AND token_verificacao_expira > NOW()
            LIMIT 1
        `;
        db.query(sql, [token], (err, result) => {
            if (err) return reject(err);
            resolve(result[0] || null);
        });
    });
};

exports.confirmarEmail = (id) => {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE clientes 
            SET email_verificado = 1, token_verificacao = NULL, token_verificacao_expira = NULL
            WHERE id = ?
        `;
        db.query(sql, [id], (err, result) => {
            if (err) return reject(err);
            resolve({ afetados: result.affectedRows });
        });
    });
};

exports.salvarTokenVerificacao = (id, token, expira) => {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE clientes 
            SET token_verificacao = ?, token_verificacao_expira = ?
            WHERE id = ?
        `;
        db.query(sql, [token, expira, id], (err, result) => {
            if (err) return reject(err);
            resolve({ afetados: result.affectedRows });
        });
    });
};

/* ===================================================
   RECUPERAÇÃO DE SENHA
=================================================== */
exports.salvarTokenReset = (id, token, expira) => {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE clientes 
            SET token_reset = ?, token_reset_expira = ?
            WHERE id = ?
        `;
        db.query(sql, [token, expira, id], (err, result) => {
            if (err) return reject(err);
            resolve({ afetados: result.affectedRows });
        });
    });
};

exports.buscarPorTokenReset = (token) => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT * FROM clientes 
            WHERE token_reset = ? 
              AND token_reset_expira > NOW()
            LIMIT 1
        `;
        db.query(sql, [token], (err, result) => {
            if (err) return reject(err);
            resolve(result[0] || null);
        });
    });
};

/* Redefine a senha e, de quebra, confirma o email (quem clicou
   no link recebido por email comprovou que tem acesso a ele) —
   isso também é o que permite uma conta só-Google "ganhar" uma
   senha local pela primeira vez, usando esse mesmo fluxo. */
exports.redefinirSenha = (id, novaSenhaHash) => {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE clientes 
            SET senha = ?, 
                token_reset = NULL, 
                token_reset_expira = NULL,
                email_verificado = 1
            WHERE id = ?
        `;
        db.query(sql, [novaSenhaHash, id], (err, result) => {
            if (err) return reject(err);
            resolve({ afetados: result.affectedRows });
        });
    });
};