import { randomUUID } from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";

const uploadsDirectory = path.resolve(process.cwd(), "uploads");
const allowedMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

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
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, Date.now() + '-' + randomUUID() + ext);
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 2 * 1024 * 1024
    },
    fileFilter: function (req, file, cb) {
        if (!allowedMimeTypes.has(file.mimetype)) {
            return cb(new Error("Tipo de arquivo não permitido. Envie apenas imagens."));
        }

        cb(null, true);
    }
});

export { upload };