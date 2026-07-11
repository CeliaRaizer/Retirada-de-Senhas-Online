const router = require("express").Router();
const controller = require("../controllers/atendenteController");
const admin = require("../middlewares/adminMiddleware");

/* Toda a gestão de atendentes é exclusiva do admin */
router.post("/", admin, controller.criar);
router.get("/", admin, controller.listar);
router.put("/:id", admin, controller.atualizar);
router.put("/:id/senha", admin, controller.resetarSenha);
router.put("/:id/desativar", admin, controller.desativar);

module.exports = router;