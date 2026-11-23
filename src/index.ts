import express from 'express';
import path from 'path';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import dotenv from 'dotenv';
import { connection } from './infra/Connection';
import { usuarioRoutes } from './routes/UsuarioRoutes';
import { dashboardRoutes } from './routes/DashboardRoutes';
import { tipoMensagemRoutes } from './routes/TipoMensagemRoutes';
import { assinaturaRoutes } from './routes/AssinaturaRoutes';
import { destinatarioRoutes } from './routes/DestinatarioRoutes';
import { planoRoutes } from './routes/PlanoRoutes';
import { comentarioRoutes } from './routes/ComentarioRoutes';
import { muralRoutes } from './routes/MuralRoutes';
import { guardiaoRoutes } from './routes/GuardiaoRoutes';
import { mensagemRoutes } from './routes/MensagemRoutes';
import { biografiaRoutes } from './routes/BiografiaRoutes';
import { transporter } from './infra/mail/NodeMailer';
import { iniciarWorkerMensagens } from './infra/mail/MensagemDeliveryWorker';
import { legalRoutes } from './routes/LegalRoutes';
import { legalConsentMiddleware } from './middlewares/LegalConsentMiddleware';
import { feedbackRoutes } from './routes/FeedbackRoutes';

dotenv.config();
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
    throw new Error('Defina SESSION_SECRET no arquivo .env.');
}

const app = express();
const PORT = process.env.PORT || 3333;
const PgSessionStore = connectPgSimple(session);
const sessionStore = new PgSessionStore({
    pool: connection,
    tableName: 'session',
    createTableIfMissing: true
});

app.set('view engine', 'ejs');

app.set('views', './src/views');
app.use('/IMGS', express.static(path.resolve(__dirname, '..', 'IMGS')));

app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

const limitesCamposTexto: Record<string, number> = {
    codigo: 6,
    dataNasc: 10,
    dataEnvio: 30,
    dataDeEnvio: 30,
    dias: 3,
    email: 150,
    nome: 100,
    nomePlano: 80,
    nomeTipo: 25,
    numero: 20,
    senha: 25,
    telefone: 20,
    titulo: 100,
    conteudo: 2500,
    valorMensal: 20,
    armazenamentoGB: 20,
    tipo: 50
};

app.use((req, res, next) => {
    for (const dados of [req.body, req.query]) {
        if (!dados || typeof dados !== 'object') continue;

        for (const [campo, valor] of Object.entries(dados)) {
            const valores = Array.isArray(valor) ? valor : [valor];
            const limite = limitesCamposTexto[campo] ?? 255;
            if (valores.some((item) => typeof item === 'string' && item.length > limite)) {
                res.status(400).send(`O campo informado excede o limite de ${limite} caracteres.`);
                return;
            }
        }
    }
    next();
});

app.use('/uploads', (req, res, next): void => {
    const permittedExtensions = new Set([
        '.jpg', '.jpeg', '.png', '.webp', '.gif',
        '.mp4', '.webm', '.mp3', '.wav', '.ogg'
    ]);
    if (!permittedExtensions.has(path.extname(req.path).toLowerCase())) {
        res.sendStatus(404);
        return;
    }

    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
}, express.static(path.resolve(process.cwd(), 'uploads'), {
    dotfiles: 'deny',
    index: false
}));

app.get('/', function (req, res) {
    res.render('index', { message: 'Hello' });
});

app.use(session({
    store: sessionStore,
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1 * 1000 * 60 * 60,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

app.use((req, res, next) => {
  const session = req.session as any;
  res.locals.usuario = session?.usuario || null;
  next();
});

app.use(legalConsentMiddleware);

// NÃO ESQUECER DO APP.USE!!! IMPORTANTÍSSIMO PARA QUE AS ROTAS SEJAM RECONHECIDAS PELO EXPRESS
app.use(legalRoutes);
app.use(feedbackRoutes);
app.use(assinaturaRoutes);
app.use(biografiaRoutes);
app.use(comentarioRoutes);
app.use(dashboardRoutes);
app.use(destinatarioRoutes);
app.use(guardiaoRoutes);
app.use(mensagemRoutes);
app.use(muralRoutes);
app.use(planoRoutes);
app.use(tipoMensagemRoutes);
app.use(usuarioRoutes);

connection.connect()
    .then(async () => { 
        try {
            await transporter.verify();
            console.log('Conexão SMTP verificada; nenhum e-mail foi enviado durante esta verificação.')
        } catch (err) {
            console.error("VERIFICAÇÃO FALHOU!:", err);
        }

        iniciarWorkerMensagens();
        app.listen(PORT, () => {
            console.log(`Servidor rodando no endereço http://localhost:${PORT}`);
        });
    })
    .catch((err) => { 
        console.error('Erro ao conectar ao banco de dados:', err);
        process.exit(1); // Encerra o processo com um código de erro
    });
