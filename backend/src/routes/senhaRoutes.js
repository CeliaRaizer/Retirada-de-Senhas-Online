const express = require("express");
const router = express.Router();

const controller = require("../controllers/senhaController");

const auth = require("../middlewares/authMiddleware");
const admin = require("../middlewares/adminMiddleware");

const configController = require("../controllers/configController");

/* ===================== CLIENTE ===================== */
router.post("/senha", auth, controller.criar);
router.get("/minha-senha", auth, controller.minhaSenha);
router.put("/minha-senha/cancelar", auth, controller.cancelarMinhaSenha);

/* ===================== ADMIN ===================== */
router.get("/senhas", admin, controller.listar);
router.put("/senha/chamar", admin, controller.chamar);
router.put("/senha/finalizar/:id", admin, controller.finalizar);
router.put("/senha/cancelar/:id", admin, controller.cancelar);
router.put("/senhas/resetar", admin, controller.resetarFila);

// ←←←←← ESSA LINHA É A MAIS IMPORTANTE AGORA:
router.get("/historico", admin, controller.historicoPorData);

/* ===================== PÚBLICO ===================== */
router.get("/fila", controller.filaPublica);



router.get("/config/tempo",        admin, configController.getTempo);
router.put("/config/tempo",        admin, configController.setTempo);

module.exports = router;