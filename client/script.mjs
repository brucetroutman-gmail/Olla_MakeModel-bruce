const form = document.getElementById('modelfileForm');
const responseDiv = document.getElementById('response');

form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const modelName = document.getElementById('modelName').value;
    const fromModel = document.getElementById('fromModel').value;
    const systemPrompt = document.getElementById('systemPrompt').value;
    const parameters = document.getElementById('parameters').value;
    const files = document.getElementById('files').files;

    const modelfileContent = buildModelfile(fromModel, systemPrompt, parameters);

    const formData = new FormData();
    formData.append('name', modelName);
    formData.append('modelfile', modelfileContent);
    for (let file of files) {
        formData.append('files', file);
    }

    try {
        const response = await fetch('http://localhost:3000/create-model', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        responseDiv.textContent = response.ok ? 
            `Model "${modelName}" created successfully!` : 
            `Error: ${result.error}`;
    } catch (error) {
        responseDiv.textContent = `Error: ${error.message}`;
    }
});

function buildModelfile(from, system, parameters) {
    let content = `FROM ${from}\n`;
    if (system) content += `SYSTEM """${system}"""\n`;
    if (parameters) content += `${parameters}\n`;
    return content;
}