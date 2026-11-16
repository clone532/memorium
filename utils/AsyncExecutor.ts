import { NextFunction, Request, Response } from "express";

export function asyncExecutor(handler: (req: Request, res: Response, next?: NextFunction) => Promise<any> | any) {
    return function(request: Request, response: Response, next?: NextFunction): void {
        const handleError = (error: unknown): void => {
            console.error(`Erro na rota ${request.method} ${request.url}:`, error);

            if (response.headersSent) {
                next?.(error);
                return;
            }

            response.status(500).json({ error: 'Ocorreu um erro interno no servidor.' });
        };

        try {
            Promise.resolve(handler(request, response, next)).catch(handleError);
        } catch (error) {
            handleError(error);
        }
    }
}