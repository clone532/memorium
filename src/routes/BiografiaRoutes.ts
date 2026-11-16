import { Router } from "express";
import { BiografiaController } from "../controllers/BiografiaController";
import { asyncExecutor } from "../../utils/AsyncExecutor";
import { authMiddleware } from "../middlewares/AuthMiddleware";
import { uploadPublicacao } from "../middlewares/UploadMiddleware";

const biografiaRoutes = Router();

biografiaRoutes.post(
    "/perfilUsuario/perfil/:id/biografia",
    authMiddleware(["ADMIN", "USUARIO", "GUARDIAO"]),
    uploadPublicacao,
    asyncExecutor(BiografiaController.criarPublicacao)
);

export { biografiaRoutes };