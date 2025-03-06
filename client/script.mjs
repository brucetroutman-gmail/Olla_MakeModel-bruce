const form = document.getElementById('modelfileForm');
const responseDiv = document.getElementById('response');
const systemPrompt = document.getElementById('systemPrompt');
const parameters = document.getElementById('parameters');

// Set default values in form fields
const defaultSystem = `---TEXT START---\n{{DOCUMENT_TEXT}}\n---TEXT END---\nUse ONLY the text between ---TEXT START--- and ---TEXT END--- to answer questions. If the answer isn’t there, say EXACTLY: "Sorry, I can't find that information in the document text."`;
const defaultParameters = `PARAMETER temperature 0.0\nPARAMETER top_p 0.1\nPARAMETER top_k 10`;

systemPrompt.value = defaultSystem;
parameters.value = defaultParameters;

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const modelName = document.getElementById('modelName').value;
    const fromModel = document.getElementById('fromModel').value;
    const systemPromptValue = systemPrompt.value;
    const parametersValue = parameters.value;
    const files = document.getElementById('files').files;

    if (!files.length) {
        responseDiv.textContent = 'Error: A document file is required.';
        return;
    }

    const fileReader = new FileReader();
    fileReader.onload = async (e) => {
        const fileContent = e.target.result;
        const modelfileContent = buildModelfile(fromModel, systemPromptValue, parametersValue, fileContent);

        try {
            const response = await fetch('http://localhost:3021/create-model', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: modelName, modelfile: modelfileContent })
            });

            const result = await response.json();
            if (response.ok) {
                // Display initial success message
                responseDiv.innerHTML = `${result.message}<br>Run it with: <code>ollama run ${modelName}</code>`;
                
                // Pause for 1 second before showing modelfile
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Append modelfile output
                responseDiv.innerHTML += `<br><br><strong>Modelfile:</strong><br><pre>${result.modelfile}</pre>`;
            } else {
                responseDiv.textContent = `Error: ${result.error}`;
            }
        } catch (error) {
            responseDiv.textContent = `Error: ${error.message}`;
        }
    };
    fileReader.readAsText(files[0]);
});

function buildModelfile(from, system, parameters, fileContent) {
    const systemWithContent = system.replace('{{DOCUMENT_TEXT}}', fileContent);
    let content = `FROM ${from}\n`;
    content += `SYSTEM """${systemWithContent}"""\n`;
    content += `${parameters}\n`;
    return content;
}