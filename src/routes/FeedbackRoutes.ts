import { Router } from 'express';
import { authMiddleware } from '../middlewares/AuthMiddleware';
import { asyncExecutor } from '../../utils/AsyncExecutor';
import { FeedbackController } from '../controllers/FeedbackController';

const feedbackRoutes = Router();

feedbackRoutes.get('/feedback', authMiddleware(['USUARIO', 'ADMIN', 'GUARDIAO']), asyncExecutor(FeedbackController.carregarFeedback));
feedbackRoutes.post('/feedback', authMiddleware(['USUARIO', 'ADMIN', 'GUARDIAO']), asyncExecutor(FeedbackController.enviarFeedback));

export {
    feedbackRoutes
}