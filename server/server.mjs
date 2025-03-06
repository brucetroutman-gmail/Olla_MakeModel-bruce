import { createServer } from 'http';
import { parse } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execPromise = promisify(exec);

const server = createServer(async (req, res) => {
    const { pathname } = parse(req.url);
    const normalizedPath = pathname.replace(/\/+$/, '');

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (normalizedPath === '/create-model' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            const { name, modelfile } = JSON.parse(body);
            console.log('Received:', { name, modelfile });

            if (!name || !modelfile) {
                console.error('Missing required fields');
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Name and modelfile are required' }));
                return;
            }

            try {
                const tempFile = path.join(process.cwd(), `${name}_temp.modelfile`);
                await fs.writeFile(tempFile, modelfile);
                console.log('Wrote modelfile to:', tempFile);

                const { stdout, stderr } = await execPromise(`ollama create ${name} -f ${tempFile}`);
                console.log('Ollama create stdout:', stdout);
                if (stderr) {
                    console.error('Ollama create stderr:', stderr);
                    if (stderr.includes('error')) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Failed to create model: ' + stderr }));
                        return;
                    }
                }

                await fs.unlink(tempFile);

                // Check stdout for success confirmation
                const successMessage = stdout.includes('success') ? 'Model created successfully' : 'Model creation completed';
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: successMessage, modelfile }));
            } catch (error) {
                console.error('Server error:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
    } else if (normalizedPath === '' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Server is running. Use the client at /client/index.html to create models.');
    } else {
        console.log(`404: ${req.method} ${pathname}`);
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});

server.listen(3021, () => {
    console.log('Server running at http://localhost:3021');
});