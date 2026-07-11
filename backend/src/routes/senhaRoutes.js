const express = require("express");
const router = express.Router();

const controller = require("../controllers/senhaController");

const auth = require("../middlewares/authMiddleware");
const admin = require("../middlewares/adminMiddleware");
const staff = require("../middlewares/adminOuAtendenteMiddleware");

const configController = require("../controllers/configController");

/* ===================== CLIENTE ===================== */
router.post("/senha", auth, controller.criar);
router.get("/minha-senha", auth, controller.minhaSenha);
router.put("/minha-senha/cancelar", auth, controller.cancelarMinhaSenha);

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