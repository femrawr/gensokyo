import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';

import { IncomingForm } from 'formidable';
import { fileURLToPath } from 'url';

import shred from './utils/shred.js';

const PORT = 5849;

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '_uploaded');

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, {
        recursive: true
    });
}

app.use('/uploads', express.static(uploadDir));
app.use(express.static('public'));

app.post('/upload', (req, res) => {
    const income = new IncomingForm({
        uploadDir: uploadDir,
        keepExtensions: true,
        maxFileSize: 50 * 1024 * 1024,
        multiples: true
    });

    income.parse(req, (err, _, files) => {
        if (err) {
            console.warn('failed to parse form:', err);
            return res.status(500).json({
                message: 'failed to parse form'
            });
        }

        try {
            const filesList = [];
            const fileArray = Array.isArray(files.files) ? files.files : [files.files];

            fileArray.forEach(async file => {
                if (!file || !file.filepath)
                    return;

                const fullName = file.originalFilename || 'file';

                const extension = path.extname(fullName);
                const name = path.basename(fullName, extension);
                const newName = `${name}_${Date.now()}${extension}`;

                fs.copyFileSync(
                    file.filepath,
                    path.join(uploadDir, newName)
                );

                try {
                    await shred(file.filepath);
                } catch (e) {
                    console.warn('failed to delete temp file:', e.message);
                }

                filesList.push(newName);
                console.log('uploaded:', newName);
            });

            res.status(200).json({
                message: 'file successfully uploaded',
                files: filesList,
            });
        } catch (e) {
            console.error('failed to upload:', e.message);
            res.status(500).json({
                message: 'failed to upload'
            });
        }
    });
});

app.get('/files', (_, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) {
            console.warn('failed to read files:', err);
            return res.status(500).json({
                message: 'failed to read files'
            });
        }

        res.status(200).json(files);
    });
});

app.get('/shred/:filename', async (req, res) => {
    try {
        const file = req.params.filename;

        if (file.includes('..') || file.includes('/') || file.includes('\\')) {
            return res.status(400).json({
                message: 'invalid file'
            });
        }

        const filePath = path.join(uploadDir, file);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: 'failed to find file'
            });
        }

        await shred(filePath);
        
        console.log('shredded:', file);
        res.status(200).json({
            message: 'file successfully shredded',
            data: file
        });
        
    } catch (e) {
        console.warn('failed to shred file:', e.message);
        res.status(500).json({
            message: 'failed to shred file'
        });
    }
});

const IP = (() => {
    const net = os.networkInterfaces();

    for (const i in net) {
        for (const j of net[i]) {
            if (j.family !== 'IPv4' || j.internal)
                continue;

            return j.address;
        }
    }

    return '127.0.0.1';
})();

app.listen(PORT, IP, () => {
    console.log(`listening on http://${IP}:${PORT}`);
});