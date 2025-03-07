const form = document.getElementById('modelfileForm');
const responseDiv = document.getElementById('response');
const systemPrompt = document.getElementById('systemPrompt');
const parameters = document.getElementById('parameters');
const fromModel = document.getElementById('fromModel');
const filesInput = document.getElementById('files');
const modelNameInput = document.getElementById('modelName');

// Set default values
const defaultSystem = `---TEXT START---\n{{filecontent "{{FILENAME}}"}}n---TEXT END---\nUse ONLY the text between ---TEXT START--- and ---TEXT END--- to answer questions. If the answer isn’t there, say EXACTLY: "Sorry, I can't find that information in the document text."`;
const defaultParameters = `PARAMETER temperature 0.0\nPARAMETER top_p 0.1\nPARAMETER top_k 10`;

systemPrompt.value = defaultSystem;
parameters.value = defaultParameters;

// Fetch base models from Ollama, excluding those with dashes
async function populateBaseModels() {
    try {
        const response = await fetch('http://localhost:11434/api/tags');
        const data = await response.json();
        data.models.forEach(model => {
            // Skip models with dashes in their names
            if (!model.name.includes('-')) {
                const option = document.createElement('option');
                option.value = model.name;
                option.text = model.name;
                fromModel.appendChild(option);
            }
        });
        const llama3Option = Array.from(fromModel.options).find(opt => opt.value.includes('llama3'));
        if (llama3Option) fromModel.value = llama3Option.value;
    } catch (error) {
        console.error('Error fetching base models:', error);
        fromModel.innerHTML = '<option value="llama3">llama3 (default)</option>';
    }
}

// Generate dynamic model name
function generateModelName(from, fileName, params) {
    const baseModel = from.split(':')[0];
    const docName = fileName.split('.').slice(0, -1).join('').substring(0, 10);
    const paramLines = params.split('\n');
    const temp = paramLines.find(line => line.includes('temperature'))?.split(' ')[2] || '0.0';
    const topP = paramLines.find(line => line.includes('top_p'))?.split(' ')[2] || '0.1';
    const topK = paramLines.find(line => line.includes('top_k'))?.split(' ')[2] || '10';
    return `${baseModel}-${docName}-${temp}-${topP}-${topK}`.replace(/\s+/g, '');
}

// Update model name dynamically
function updateModelName() {
    const from = fromModel.value;
    const fileName = filesInput.files[0]?.name || '';
    const params = parameters.value;
    if (from && fileName) {
        modelNameInput.value = generateModelName(from, fileName, params);
    }
}

// Event listeners for dynamic updates
fromModel.addEventListener('change', updateModelName);
filesInput.addEventListener('change', updateModelName);
parameters.addEventListener('input', updateModelName);

// Populate base models on load
populateBaseModels().then(updateModelName);

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const modelName = modelNameInput.value;
    const from = fromModel.value;
    const systemPromptValue = systemPrompt.value;
    const parametersValue = parameters.value;
    const file = filesInput.files[0];

    if (!file) {
        responseDiv.textContent = 'Error: A document file is required.';
        return;
    }

    // Use the uploaded file's name in the modelfile
    const fileName = file.name;
    const modelfileContent = buildModelfile(from, systemPromptValue, parametersValue, fileName);

    // Send file and modelfile content via FormData
    const formData = new FormData();
    formData.append('name', modelName);
    formData.append('modelfile', modelfileContent);
    formData.append('textFile', file);

    try {
        const response = await fetch('http://localhost:3021/create-model', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (response.ok) {
            responseDiv.innerHTML = `${result.message}<br>Run it with: <code>ollama run ${modelName}</code>`;
            await new Promise(resolve => setTimeout(resolve, 1000));
            responseDiv.innerHTML += `<br><br><strong>Modelfile:</strong><br><pre>${result.modelfile}</pre>`;
        } else {
            responseDiv.textContent = `Error: ${result.error}`;
        }
    } catch (error) {
        responseDiv.textContent = `Error: ${error.message}`;
    }
});

function buildModelfile(from, system, parameters, fileName) {
    // Replace {{FILENAME}} with the actual uploaded file name
    const systemWithFile = system.replace('{{FILENAME}}', fileName);
    let content = `FROM ${from}\n`;
    content += `SYSTEM """${systemWithFile}"""\n`;
    content += `${parameters}\n`;
    return content;
}