const db = require("../config/db");

/* ===================================================
   CRIAR ATENDENTE (admin)
=================================================== */
exports.criarAtendente = (nome, email, senhaHash, criadoPor) => {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO atendentes (nome, email, senha, criado_por)
            VALUES (?, ?, ?, ?)
        `;
        db.query(sql, [nome, email, senhaHash, criadoPor], (err, result) => {
            if (err) return reject(err);
            resolve({
                id: result.insertId,
                nome,
                email,
                ativo: 1
            });
        });
    });
};

/* ===================================================
   LISTAR ATENDENTES (admin)
=================================================== */
exports.listarAtendentes = () => {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT id, nome, email, ativo, criado_em
            FROM atendentes
            ORDER BY nome ASC
        `;
        db.query(sql, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

/* ===================================================
   BUSCAR POR EMAIL (usado no login)
=================================================== */
exports.buscarPorEmail = (email) => {
    return new Promise((resolve, reject) => {
        const sql = `SELECT * FROM atendentes WHERE email = ? LIMIT 1`;
        db.query(sql, [email], (err, result) => {
            if (err) return reject(err);
            resolve(result[0] || null);
        });
    });
};

/* ===================================================
   ATUALIZAR ATENDENTE (admin) — nome / email / ativo
=================================================== */
exports.atualizarAtendente = (id, { nome, email, ativo }) => {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE atendentes
            SET nome = COALESCE(?, nome),
                email = COALESCE(?, email),
                ativo = COALESCE(?, ativo)
            WHERE id = ?
        `;
        db.query(sql, [nome ?? null, email ?? null, ativo ?? null, id], (err, result) => {
            if (err) return reject(err);
            resolve({ mensagem: "Atendente atualizado", afetados: result.affectedRows });
        });
    });
};

/* ===================================================
   ATUALIZAR SENHA DO ATENDENTE (admin, ex: reset de senha)
=================================================== */
exports.atualizarSenha = (id, senhaHash) => {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE atendentes SET senha = ? WHERE id = ?`;
        db.query(sql, [senhaHash, id], (err, result) => {
            if (err) return reject(err);
            resolve({ mensagem: "Senha do atendente atualizada", afetados: result.affectedRows });
        });
    });
};

/* ===================================================
   DESATIVAR ATENDENTE (admin) — soft delete
=================================================== */
exports.desativarAtendente = (id) => {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE atendentes SET ativo = 0 WHERE id = ?`;
        db.query(sql, [id], (err, result) => {
            if (err) return reject(err);
            resolve({ mensagem: "Atendente desativado", afetados: result.affectedRows });
        });
    });
};