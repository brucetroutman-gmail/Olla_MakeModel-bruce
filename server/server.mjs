import { createServer } from 'http';
import { parse } from 'url';
import { formidable } from 'formidable';
import fetch from 'node-fetch';

const OLLAMA_API_URL = 'http://localhost:11434/api/create';

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
        const form = formidable({ multiples: true });
        
        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error('Form parsing error:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Form parsing error' }));
                return;
            }

            const name = Array.isArray(fields.name) ? fields.name[0] : fields.name;
            const modelfile = Array.isArray(fields.modelfile) ? fields.modelfile[0] : fields.modelfile;
            console.log('Received:', { name, modelfile });

            if (!name || !modelfile) {
                console.error('Missing required fields');
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Name and modelfile are required' }));
                return;
            }

            try {
                console.log('Sending to Ollama:', JSON.stringify({ name, modelfile }, null, 2));
                const ollamaResponse = await fetch(OLLAMA_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, modelfile })
                });

                const responseText = await ollamaResponse.text();
                console.log('Ollama response status:', ollamaResponse.status);
                console.log('Ollama response body:', responseText);

                if (!ollamaResponse.ok) {
                    console.error('Ollama API error:', responseText);
                    res.writeHead(ollamaResponse.status, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: responseText }));
                    return;
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Model created successfully' }));
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

server.listen(3000, () => {
    console.log('Server running at http://localhost:3000');
});