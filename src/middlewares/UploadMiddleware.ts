import { randomUUID } from "crypto";
import fs from "fs";
import multer from "multer";
import path from "path";

const uploadsDirectory = path.resolve(process.cwd(), "uploads");

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
        const ext = path.extname(file.originalname);
        cb(null, Date.now() + '-' + randomUUID() + ext);
    }
});

const upload = multer({ storage });

export { upload };