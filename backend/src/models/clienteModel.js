const db = require("../config/db");

/* ===================================================
   CRIAR CLIENTE (cadastro local)
=================================================== */
exports.criarCliente = (nome, email, senhaHash) => {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO clientes (nome, email, senha)
            VALUES (?, ?, ?)
        `;
        db.query(sql, [nome, email, senhaHash], (err, result) => {
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
   BUSCAR POR EMAIL (usado no login e no cadastro,
   pra checar duplicidade)
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
   BUSCAR POR GOOGLE ID (usado no login Google,
   próxima etapa)
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
   (ex: pessoa se cadastrou com email+senha antes e
   agora está entrando com Google pela primeira vez)
=================================================== */
exports.vincularGoogleId = (id, googleId) => {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE clientes SET google_id = ? WHERE id = ?`;
        db.query(sql, [googleId, id], (err, result) => {
            if (err) return reject(err);
            resolve({ mensagem: "Google vinculado", afetados: result.affectedRows });
        });
    });
};

/* ===================================================
   CRIAR CLIENTE VIA GOOGLE (sem senha local)
=================================================== */
exports.criarClienteGoogle = (nome, email, googleId) => {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO clientes (nome, email, google_id)
            VALUES (?, ?, ?)
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