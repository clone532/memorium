import express from 'express';
import path from 'path';
import session from 'express-session';
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

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3333;

app.set('view engine', 'ejs');

app.set('views', './src/views');
app.use('/IMGS', express.static(path.resolve(__dirname, '..', 'IMGS')));
app.use('/uploads', express.static('uploads'));

app.use(express.urlencoded({ extended: false }));

app.get('/', function (req, res) {
    res.render('index', { message: 'Hello' });
});

app.use(session({
    secret: 'chave123', //chave usada para assinar o cookie
    resave: false, //evita salvar a sessão se nada mudou
    saveUninitialized: true, //salva as sessões não inicializadas
    cookie: { maxAge: 1 * 1000 * 60 * 60 } //uma hora de tempo de expiração
}));

app.use((req, res, next) => {
  const session = req.session as any;
  res.locals.usuario = session.usuario || null;
  next();
});

app.use(session({
    secret: process.env.SESSION_SECRET || 'nova-versao', //chave usada para assinar o cookie
    resave: false, //evita salvar a sessão se nada mudou
    saveUninitialized: true, //salva as sessões não inicializadas
    cookie: { maxAge: 1 * 1000 * 60 * 60 } //uma hora de tempo de expiração
}));

// NÃO ESQUECER DO APP.USE!!! IMPORTANTÍSSIMO PARA QUE AS ROTAS SEJAM RECONHECIDAS PELO EXPRESS
app.use(assinaturaRoutes);
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
    .then(() => { 
        console.log('Conectado ao banco de dados com sucesso!')
        app.listen(PORT, () => {
            console.log(`Servidor rodando no endereço http://localhost:${PORT}`);
        });
    })
    .catch((err) => { 
        console.error('Erro ao conectar ao banco de dados:', err);
        process.exit(1); // Encerra o processo com um código de erro
    });
