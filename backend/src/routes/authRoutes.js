const router = require("express").Router();
const passport = require("passport");
const controller = require("../controllers/authController");

router.get("/google",
    passport.authenticate("google", {
        scope: ["profile", "email"]
    })
);

router.get("/google/callback",
    passport.authenticate("google", {
        session: false
    }),
    controller.callback
);

router.post("/admin/login", controller.loginAdmin);
router.post("/atendente/login", controller.loginAtendente);
router.post("/cliente/registro", controller.registrarCliente);
router.post("/cliente/login", controller.loginCliente);

router.get("/cliente/verificar", controller.verificarEmail);
router.post("/cliente/reenviar-verificacao", controller.reenviarVerificacao);

router.post("/cliente/recuperar-senha", controller.solicitarRecuperacaoSenha);
router.post("/cliente/redefinir-senha", controller.redefinirSenha);

module.exports = router;