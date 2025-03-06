# Ollama Modelfile Builder

A web app to create Ollama models with embedded document text, restricting responses to that text only.

## Setup

1. **Clone the Repo**:
   ```bash
   git clone https://github.com/brucetroutman/olla_makemodel-bruce.git
   cd olla_makemodel-bruce

   npm install

   Check version: ollama --version
   Update if needed: curl -fsSL https://ollama.ai/install.sh | sh
   Pull base model: ollama pull llama3

   bash start-builder.sh

   Server runs on http://localhost:3021
   Browser opens to http://localhost:3021/client/index.html

Files
client/index.html: Web UI.
client/script.mjs: Client-side logic.
server/server.mjs: Server with static file serving and model creation.
start-builder.sh: Launches server and browser.

Notes
Built with Ollama 0.5.11 (update if issues arise).
Last updated: March 2025.


