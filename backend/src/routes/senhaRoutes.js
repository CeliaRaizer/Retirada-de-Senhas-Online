const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const controller = require("../controllers/senhaController");

const auth = require("../middlewares/authMiddleware");
const admin = require("../middlewares/adminMiddleware");
const staff = require("../middlewares/adminOuAtendenteMiddleware");

const configController = require("../controllers/configController");

// Camada extra de proteção: mesmo com o controle por dispositivo,
// um script poderia gerar um dispositivoId novo a cada requisição.
// Esse limite não trava usuários legítimos (várias pessoas atrás do
// mesmo IP/Wi-Fi), só freia picos anormais de criação.
const limiteSenhaAnonima = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 30,
    message: { mensagem: "Muitas senhas criadas nesse IP. Tente novamente mais tarde." },
    standardHeaders: true,
    legacyHeaders: false
});

/* ===================== CLIENTE ===================== */
router.post("/senha", auth, controller.criar);
router.get("/minha-senha", auth, controller.minhaSenha);
router.put("/minha-senha/cancelar", auth, controller.cancelarMinhaSenha);
router.get("/minhas-senhas/historico", auth, controller.meuHistorico);

/* ===================== SEM LOGIN (retirada anônima) ===================== */
router.post("/senha/anonima", limiteSenhaAnonima, controller.criarAnonima);
router.get("/senha/status", controller.statusPorCodigo);
router.put("/senha/anonima/cancelar", controller.cancelarPorCodigo);

/* ============ OPERAÇÃO DA FILA (admin ou atendente) ============ */
router.get("/senhas", staff, controller.listar);
router.put("/senha/chamar", staff, controller.chamar);
router.put("/senha/finalizar/:id", staff, controller.finalizar);
router.put("/senha/cancelar/:id", staff, controller.cancelar);

/* ===================== SOMENTE ADMIN ===================== */
router.put("/senhas/resetar", admin, controller.resetarFila);
router.get("/historico", admin, controller.historicoPorData);

/* ===================== PÚBLICO ===================== */
router.get("/fila", controller.filaPublica);



router.get("/config/tempo",        admin, configController.getTempo);
router.put("/config/tempo",        admin, configController.setTempo);

module.exports = router;