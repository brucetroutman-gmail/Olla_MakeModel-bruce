import { createServer } from 'http';
import { parse } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import formidable from 'formidable';

const execPromise = promisify(exec);

const server = createServer(async (req, res) => {
    const { pathname } = parse(req.url, true);
    const normalizedPath = pathname.replace(/^\/+|\/+$/g, '');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (normalizedPath === 'create-model' && req.method === 'POST') {
        const form = formidable({ uploadDir: path.join(process.cwd()), keepExtensions: true });
        form.parse(req, async (err, fields, files) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Failed to parse form' }));
                return;
            }

            const name = fields.name?.[0];
            const modelfile = fields.modelfile?.[0];
            const textFile = files.textFile?.[0];

            if (!name || !modelfile || !textFile) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Name, modelfile, and text file are required' }));
                return;
            }

            try {
                // Move uploaded file to project root with original name
                const textFilePath = path.join(process.cwd(), textFile.originalFilename);
                await fs.rename(textFile.filepath, textFilePath);

                const tempFile = path.join(process.cwd(), `${name}_temp.modelfile`);
                await fs.writeFile(tempFile, modelfile);

                const { stdout, stderr } = await execPromise(`ollama create ${name} -f ${tempFile}`);
                if (stderr && stderr.includes('error')) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to create model: ' + stderr }));
                    return;
                }

                await fs.unlink(tempFile);

                const successMessage = stdout.includes('success') ? 'Model created successfully' : 'Model creation completed';
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: successMessage, modelfile }));
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    } else if (req.method === 'GET') {
        let filePath;
        if (normalizedPath === '') {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Server is running. Use the client at /client/index.html to create models.');
            return;
        } else if (normalizedPath.startsWith('client')) {
            filePath = path.join(process.cwd(), normalizedPath);
        } else {
            filePath = path.join(process.cwd(), 'client', normalizedPath || 'index.html');
        }

        try {
            const stats = await fs.stat(filePath);
            if (stats.isFile()) {
                const ext = path.extname(filePath).toLowerCase();
                const contentType = {
                    '.html': 'text/html',
                    '.mjs': 'application/javascript',
                    '.css': 'text/css',
                    '.ico': 'image/x-icon'
                }[ext] || 'application/octet-stream';

                const fileContent = await fs.readFile(filePath);
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(fileContent);
            } else {
                throw new Error('Not a file');
            }
        } catch (error) {
            console.log(`404: ${req.method} ${pathname}`);
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not Found' }));
        }
    } else {
        console.log(`404: ${req.method} ${pathname}`);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});

server.listen(3021, () => {
    console.log('Server running at http://localhost:3021');
});
