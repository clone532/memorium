const dotenv = require("dotenv");
const { createTransport } = require("nodemailer");

dotenv.config();

const emailUser = process.env.EMAIL_USER;
const emailPass = process.env.EMAIL_PASS;
const destinatario = process.argv[2] || emailUser;

if (!emailUser || !emailPass) {
    console.error("Configure EMAIL_USER e EMAIL_PASS no arquivo .env.");
    process.exit(1);
}

if (!destinatario) {
    console.error("Informe um destinatário ou configure EMAIL_USER no arquivo .env.");
    process.exit(1);
}

const transporter = createTransport({
    service: "gmail",
    auth: {
        user: emailUser,
        pass: emailPass
    }
});

async function enviarEmailDeTeste() {
    try {
        const info = await transporter.sendMail({
            from: emailUser,
            to: destinatario,
            subject: "Teste de envio - Memorium",
            text: "Este é um teste de envio de e-mail do Memorium."
        });

        if (!info.accepted || info.accepted.length === 0) {
            throw new Error(`O servidor SMTP não aceitou o destinatário: ${destinatario}`);
        }

        console.log(`E-mail aceito pelo servidor SMTP. ID da mensagem: ${info.messageId}`);
        console.log("Se não aparecer na caixa de entrada, confira também Spam e Lixeira.");
    } catch (error) {
        console.error("Falha ao enviar o e-mail de teste:", error);
        process.exitCode = 1;
    } finally {
        transporter.close();
    }
}

enviarEmailDeTeste();
