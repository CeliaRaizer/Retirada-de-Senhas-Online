const nodemailer = require("nodemailer");

/*
 * Ethereal é um serviço de teste do próprio Nodemailer: nenhum email
 * chega numa caixa real. Em vez disso, cada envio gera um link de
 * "preview" que aparece no console — abre no navegador pra ver o
 * email como se fosse um webmail.
 *
 * A conta de teste é criada uma única vez (não a cada email), na
 * primeira vez que alguém chama enviarEmail().
 */
let transporterPromise = null;

function getTransporter() {
    if (!transporterPromise) {
        transporterPromise = nodemailer.createTestAccount().then(conta => {
            console.log("\n📧 Conta de teste Ethereal criada (só informativo, não precisa usar):");
            console.log("   usuário:", conta.user);

            return nodemailer.createTransport({
                host: "smtp.ethereal.email",
                port: 587,
                secure: false,
                auth: { user: conta.user, pass: conta.pass }
            });
        });
    }
    return transporterPromise;
}

exports.enviarEmail = async ({ to, subject, html }) => {
    const transporter = await getTransporter();

    const info = await transporter.sendMail({
        from: '"Retirada de Senhas" <no-reply@retiradadesenhas.com>',
        to,
        subject,
        html
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);

    console.log("\n📧 ===================================");
    console.log("   Email:", subject);
    console.log("   Para:", to);
    console.log("   Preview:", previewUrl);
    console.log("===================================\n");

    return { previewUrl };
};