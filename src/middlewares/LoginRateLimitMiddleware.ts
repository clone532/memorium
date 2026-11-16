import { rateLimit } from "express-rate-limit";

export const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    skipSuccessfulRequests: true,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).render('login', {
        mensagem: {
            tipo: 'error',
            valor: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.',
            titulo: 'Tente novamente mais tarde'
        }
    })
});
