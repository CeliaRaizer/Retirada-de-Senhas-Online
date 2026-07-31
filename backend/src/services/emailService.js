const nodemailer = require("nodemailer");

/*
 * Envio real via Gmail (SMTP), usando uma senha de app do Google
 * (não a senha normal da conta). 
 *
 * Como gerar a senha de app: https://myaccount.google.com/apppasswords
 * (precisa ter a verificação em duas etapas ativada na conta Google).
 *
 * Se essas variáveis não estiverem definidas, cai de volta pro Ethereal
 * (serviço de teste do Nodemailer, não entrega de verdade) só para não
 * travar o desenvolvimento local sem configuração nenhuma.
 */
let transporterPromise = null;
let usandoEthereal = false;

function getTransporter() {
    if (!transporterPromise) {
        const { EMAIL_USER, EMAIL_PASS } = process.env;

        if (EMAIL_USER && EMAIL_PASS) {
            transporterPromise = Promise.resolve(
                nodemailer.createTransport({
                    service: "gmail",
                    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
                })
            );
        } else {
            usandoEthereal = true;
            console.warn(
                "\n⚠️  EMAIL_USER/EMAIL_PASS não configurados no .env — usando Ethereal (e-mails NÃO são entregues de verdade)."
            );
            transporterPromise = nodemailer.createTestAccount().then(conta => {
                console.log("📧 Conta de teste Ethereal criada (só informativo, não precisa usar):");
                console.log("   usuário:", conta.user);

                return nodemailer.createTransport({
                    host: "smtp.ethereal.email",
                    port: 587,
                    secure: false,
                    auth: { user: conta.user, pass: conta.pass }
                });
            });
        }
    }
    return transporterPromise;
}

exports.enviarEmail = async ({ to, subject, html }) => {
    const transporter = await getTransporter();

    const remetente = usandoEthereal
        ? '"Retirada de Senhas" <no-reply@retiradadesenhas.com>'
        : `"Retirada de Senhas" <${process.env.EMAIL_USER}>`;

    const info = await transporter.sendMail({ from: remetente, to, subject, html });

    if (usandoEthereal) {
        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log("\n📧 ===================================");
        console.log("   Email:", subject);
        console.log("   Para:", to);
        console.log("   Preview:", previewUrl);
        console.log("===================================\n");
        return { previewUrl };
    }

    console.log(`📧 Email "${subject}" enviado para ${to} (messageId: ${info.messageId})`);
    return { messageId: info.messageId };
};