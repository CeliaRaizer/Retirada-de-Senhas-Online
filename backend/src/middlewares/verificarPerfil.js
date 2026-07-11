const jwt = require("jsonwebtoken");
const db = require("../config/db");

/**
 * Factory de middleware de autorização por perfil.
 *
 * @param {string[]} perfisPermitidos - ex: ["admin"], ["atendente"], ["admin","atendente"]
 * @returns {Function} middleware do Express
 *
 * Uso:
 *   const verificarPerfil = require("../middlewares/verificarPerfil");
 *   router.post("/rota", verificarPerfil(["admin"]), controller.acao);
 */
module.exports = (perfisPermitidos = []) => {
    return async (req, res, next) => {
        try {
            const auth = req.headers.authorization;

            if (!auth) {
                return res.status(401).json({
                    mensagem: "Token obrigatório"
                });
            }

            if (!auth.startsWith("Bearer ")) {
                return res.status(401).json({
                    mensagem: "Formato inválido"
                });
            }

            const token = auth.split(" ")[1];

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            if (!perfisPermitidos.includes(decoded.perfil)) {
                return res.status(403).json({
                    mensagem: "Acesso negado"
                });
            }

            // Checagem extra no banco: o JWT do atendente vale por até 8h,
            // então sem isso um atendente desativado continuaria conseguindo
            // usar o sistema até o token expirar sozinho. Aqui garantimos
            // que ele ainda está ativo NESTE exato momento.
            if (decoded.perfil === "atendente") {
                const [rows] = await db.promise().query(
                    "SELECT ativo FROM atendentes WHERE id = ? LIMIT 1",
                    [decoded.id]
                );

                if (rows.length === 0 || !rows[0].ativo) {
                    return res.status(401).json({
                        mensagem: "Conta desativada"
                    });
                }
            }

            req.usuario = decoded;

            next();

        } catch (error) {
            return res.status(401).json({
                mensagem: "Token inválido ou expirado"
            });
        }
    };
};