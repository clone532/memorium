import { Router } from "express";
import { LegalController } from "../controllers/LegalController";

const legalRoutes = Router();

legalRoutes.get("/termos", LegalController.carregarTermos);
legalRoutes.get("/privacidade", LegalController.carregarPrivacidade);

export { legalRoutes };
