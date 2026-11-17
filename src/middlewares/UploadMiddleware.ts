import { randomUUID } from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";
import { TextDecoder } from "util";
import { NextFunction, Request, RequestHandler, Response } from "express";

const uploadsDirectory = path.resolve(process.cwd(), "uploads");
const privateMessageDirectory = path.resolve(process.cwd(), "private-uploads", "messages");
const imageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const publicationMimeTypes = new Set([
    ...imageMimeTypes,
    "video/mp4",
    "video/webm",
    "audio/mpeg",
    "audio/wav",
    "audio/ogg"
]);
const imageUploadError = "Tipo de arquivo não permitido. Envie apenas uma imagem JPEG, PNG, WebP ou GIF.";
const publicationUploadError = "Formato não permitido. Envie uma imagem, vídeo MP4/WebM ou áudio MP3/WAV/OGG.";
const messageMimeTypes = new Set([
    ...publicationMimeTypes,
    "text/plain",
    "text/csv"
]);

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        fs.mkdir(uploadsDirectory, { recursive: true }, (error) => {
            if (error) {
                return cb(error, uploadsDirectory);
            }

            cb(null, uploadsDirectory);
        });
    },
    filename: function (req, file, cb) {
        cb(null, randomUUID());
    }
});

function createUpload(mimeTypes: Set<string>, fileSize: number) {
    return multer({
        storage,
        limits: { fileSize, files: 1 },
        fileFilter: function (req, file, cb) {
            if (!mimeTypes.has(file.mimetype)) {
                return cb(new Error("FORMATO_NAO_PERMITIDO"));
            }

            cb(null, true);
        }
    });
}

const avatarUpload = createUpload(imageMimeTypes, 2 * 1024 * 1024);
const publicationUpload = createUpload(publicationMimeTypes, 10 * 1024 * 1024);

const messageUpload = multer({
    storage: multer.diskStorage({
        destination: function (_req, _file, cb) {
            fs.mkdir(privateMessageDirectory, { recursive: true }, (error) => {
                if (error) {
                    return cb(error, privateMessageDirectory);
                }
                cb(null, privateMessageDirectory);
            });
        },
        filename: function (_req, _file, cb) {
            cb(null, randomUUID());
        }
    }),
    limits: { fileSize: 10 * 1024 * 1024, files: 20 },
    fileFilter: function (_req, file, cb) {
        if (!messageMimeTypes.has(file.mimetype)) {
            return cb(new Error("FORMATO_MENSAGEM_NAO_PERMITIDO"));
        }
        cb(null, true);
    }
});

type DetectedFormat = { extension: string, mimeType: string };
type FormatDetector = (buffer: Buffer) => DetectedFormat | null;

function detectImageFormat(buffer: Buffer): DetectedFormat | null {
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return { extension: "jpg", mimeType: "image/jpeg" };
    }

    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
        return { extension: "png", mimeType: "image/png" };
    }

    if (buffer.length >= 6 && (buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a")) {
        return { extension: "gif", mimeType: "image/gif" };
    }

    if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
        return { extension: "webp", mimeType: "image/webp" };
    }

    return null;
}

function detectPublicationFormat(buffer: Buffer): DetectedFormat | null {
    const image = detectImageFormat(buffer);
    if (image) {
        return image;
    }

    if (buffer.length >= 12 && buffer.toString("ascii", 4, 8) === "ftyp") {
        return { extension: "mp4", mimeType: "video/mp4" };
    }

    if (buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))) {
        return { extension: "webm", mimeType: "video/webm" };
    }

    if (buffer.length >= 12 && buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WAVE") {
        return { extension: "wav", mimeType: "audio/wav" };
    }

    if (buffer.length >= 4 && buffer.toString("ascii", 0, 4) === "OggS") {
        return { extension: "ogg", mimeType: "audio/ogg" };
    }

    if (
        (buffer.length >= 3 && buffer.toString("ascii", 0, 3) === "ID3") ||
        (buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
    ) {
        return { extension: "mp3", mimeType: "audio/mpeg" };
    }

    return null;
}

function detectMessageFormat(buffer: Buffer, mimeType: string): DetectedFormat | null {
    if (mimeType === "text/plain" || mimeType === "text/csv") {
        if (buffer.includes(0)) {
            return null;
        }
        try {
            new TextDecoder("utf-8", { fatal: true }).decode(buffer);
        } catch {
            return null;
        }
        return { extension: mimeType === "text/csv" ? "csv" : "txt", mimeType };
    }
    const detected = detectPublicationFormat(buffer);
    return detected?.mimeType === mimeType ? detected : null;
}

async function removeUploadedFile(filePath: string) {
    try {
        await fs.promises.unlink(filePath);
    } catch (error) {
        console.error("Não foi possível remover um upload rejeitado:", error);
    }
}

async function validateAndRenameUpload(
    req: Request,
    res: Response,
    next: NextFunction,
    detectFormat: FormatDetector,
    invalidFormatMessage: string
) {
    const file = req.file;
    if (!file) {
        return next();
    }

    try {
        const content = await fs.promises.readFile(file.path);
        const detectedFormat = detectFormat(content);

        if (!detectedFormat || detectedFormat.mimeType !== file.mimetype) {
            await removeUploadedFile(file.path);
            return res.status(400).send(invalidFormatMessage);
        }

        const filename = `${file.filename}.${detectedFormat.extension}`;
        const finalPath = path.join(uploadsDirectory, filename);
        await fs.promises.rename(file.path, finalPath);
        file.filename = filename;
        file.path = finalPath;
        file.mimetype = detectedFormat.mimeType;

        return next();
    } catch (error) {
        await removeUploadedFile(file.path);
        console.error("Falha ao validar o arquivo enviado:", error);
        return res.status(500).send("Não foi possível processar o arquivo.");
    }
}

export const uploadAnexosMensagem = function (req: Request, res: Response, next: NextFunction) {
    messageUpload.array("arquivos", 20)(req, res, async (error) => {
        const files = (req.files as Express.Multer.File[] | undefined) || [];
        const removeFiles = async () => {
            await Promise.all(files.map((file) => removeUploadedFile(file.path)));
        };

        if (error) {
            if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
                return res.status(413).send("Cada arquivo deve ter no máximo 10 MB.");
            }
            if (error instanceof Error && error.message === "FORMATO_MENSAGEM_NAO_PERMITIDO") {
                return res.status(400).send("Formato não permitido. Use imagens, vídeos, áudios ou arquivos TXT/CSV.");
            }
            if (error instanceof multer.MulterError) {
                return res.status(400).send("Envie no máximo 20 arquivos por mensagem.");
            }
            console.error("Falha ao receber anexos da mensagem:", error);
            return res.status(500).send("Não foi possível receber os arquivos.");
        }

        const totalSize = files.reduce((total, file) => total + file.size, 0);
        if (totalSize > 15 * 1024 * 1024) {
            await removeFiles();
            return res.status(413).send("O tamanho total dos arquivos não pode exceder 15 MB.");
        }

        try {
            for (const file of files) {
                const content = await fs.promises.readFile(file.path);
                const detected = detectMessageFormat(content, file.mimetype);
                if (!detected) {
                    await removeFiles();
                    return res.status(400).send(`O formato do arquivo "${file.originalname}" é inválido.`);
                }

                const filename = `${file.filename}.${detected.extension}`;
                const finalPath = path.join(privateMessageDirectory, filename);
                await fs.promises.rename(file.path, finalPath);
                file.filename = filename;
                file.path = finalPath;
                file.mimetype = detected.mimeType;
            }
            return next();
        } catch (validationError) {
            await removeFiles();
            console.error("Falha ao validar anexos da mensagem:", validationError);
            return res.status(500).send("Não foi possível validar os arquivos.");
        }
    });
};

function createUploadHandler(
    parser: RequestHandler,
    detectFormat: FormatDetector,
    invalidFormatMessage: string,
    fileSizeMessage: string
) {
    return function (req: Request, res: Response, next: NextFunction) {
        parser(req, res, (error) => {
            if (error) {
                if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
                    return res.status(413).send(fileSizeMessage);
                }

                if (error instanceof Error && error.message === "FORMATO_NAO_PERMITIDO") {
                    return res.status(400).send(invalidFormatMessage);
                }

                if (error instanceof multer.MulterError) {
                    return res.status(400).send("Arquivo de upload inválido.");
                }

                console.error("Falha durante o upload:", error);
                return res.status(500).send("Não foi possível receber o arquivo.");
            }

            void validateAndRenameUpload(req, res, next, detectFormat, invalidFormatMessage);
        });
    };
}

export const uploadImagem = createUploadHandler(
    avatarUpload.single("imagem"),
    detectImageFormat,
    imageUploadError,
    "A imagem deve ter no máximo 2 MB."
);

export const uploadPublicacao = createUploadHandler(
    publicationUpload.single("anexoUrl"),
    detectPublicationFormat,
    publicationUploadError,
    "O arquivo deve ter no máximo 10 MB."
);
