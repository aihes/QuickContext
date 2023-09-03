async function fetchGeneric(apiName, apiKey, prompt_text, tab) {
    try {
        const response = await fetch('https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'X-DashScope-SSE': 'enable'
            },
            body: JSON.stringify({
                "model": "qwen-v1",
                "input": {
                    "prompt": `${prompt_text}`
                },
                "parameters": {}
            })
        });

        const reader = response.body.getReader();
        const textDecoder = new TextDecoder('utf-8');

        while (true) {
            const {value, done} = await reader.read();

            if (done) {
                break;
            }


            const chunk = textDecoder.decode(value, {stream: true});
            console.log("Received chunk:", chunk);

            // 再解析里面的text部分
            const dataMatch = chunk.match(/data:(\{.*\})/);
            if (dataMatch && dataMatch[1]) {
                const dataJson = JSON.parse(dataMatch[1]);
                if (dataJson.output && dataJson.output.text) {
                    createFloatingDiv(apiName, dataJson.output.text, tab.id);
                }
            } else {
                createFloatingDiv(apiName, chunk, tab.id);
            }

        }

        console.log("Stream complete.");
    } catch (err) {
        console.error("Fetch failed:", err);
        createFloatingDiv(apiName, "Fetch failed:" + err, tab.id);
    }
}

async function fetchOpenAI(apiName, apiKey, openaiModel, prompt_text, tab) {
    try {

        async function fetchStream() {
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST", headers: {
                    "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}`
                }, body: JSON.stringify({
                    "model": openaiModel ? openaiModel : "gpt-3.5-turbo", "stream": true, "messages": [{
                        "role": "system", "content": `${prompt_text}`
                    }]
                })
            });

            const reader = response.body.getReader();
            const textDecoder = new TextDecoder('utf-8');

            let concatenatedText = "";
            while (true) {
                const {value, done} = await reader.read();
                if (done) {
                    break;
                }
                const chunk = textDecoder.decode(value, {stream: true});
                const lines = chunk.split("\n");

                lines.forEach(line => {
                    if (line.startsWith("data: ")) {
                        const jsonString = line.substring(6);
                        if (jsonString === "[DONE]") {
                            console.log("Stream complete. Final text:", concatenatedText);
                            return;  // 或执行其他逻辑
                        }
                        try {
                            const parsedData = JSON.parse(jsonString);
                            const contentDelta = parsedData.choices[0]?.delta?.content;
                            if (contentDelta) {
                                concatenatedText += contentDelta;
                                createFloatingDiv(apiName, concatenatedText, tab.id);
                            }
                        } catch (e) {
                            console.error("Error parsing JSON:", e);
                            // createFloatingDiv(apiName, "Error parsing JSON" + line, tab.id);
                        }
                    }
                });

                console.log("Received chunk:", chunk);
            }
            console.log("Stream complete.");
        }

        fetchStream().catch(error => {
            console.error("Error:", error);
            createFloatingDiv(apiName, "Error:" + error, tab.id);
        });

    } catch (err) {
        createFloatingDiv(apiName, "Fetch failed:" + err, tab.id);
    }
}

// API 请求和处理
async function fetchData(apiType, selectedText, serverUrl, tab) {
    // 从 localStorage 获取配置

    let apiConfigs = await new Promise(resolve => chrome.storage.local.get(['apiConfigs'], result => resolve(result.apiConfigs || [])));
    let apiKey = await new Promise(resolve => chrome.storage.local.get(['api_key'], result => resolve(result.api_key || '')));
    let model_type = await new Promise(resolve => chrome.storage.local.get(['model_type'], result => resolve(result.model_type || 'generic')));
    let openai_model = await new Promise(resolve => chrome.storage.local.get(['openai_model'], result => resolve(result.openai_model || 'gpt-3.5-turbo')));


    let defaultApiConfigs = [{
        apiType: 'translate_built_in', apiName: '翻译', apiPrompt: '将如下的内容{text}翻译为中文'
    }, {apiType: 'explain_built_in', apiName: '解释', apiPrompt: '帮我详细解释如下{text} 含义'}];

    let mergedConfigs = defaultApiConfigs.concat(apiConfigs);

    // 根据 apiType 查找 apiName 和 apiPrompt
    const config = mergedConfigs.find(item => item.apiType === apiType);
    const apiName = config ? config.apiName : '';
    const apiPrompt = config ? config.apiPrompt : '';


    if (!apiKey || !model_type) {
        // 构建 payload
        const payload = {
            apiType, apiName, apiPrompt, text: selectedText, api_key: apiKey, model_type: model_type
        };

        // 发送 POST 请求
        fetch(serverUrl, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload),
        })
            .then(response => response.json())
            .then(data => {
                const result = data[apiType] || data.text;
                console.log(`Received ${apiType} result: ${result}`);
                createFloatingDiv(apiName, result.trim(), tab.id);
            })
            .catch(error => {
                console.error('Error:', error);
                createFloatingDiv(apiName, "请求出现了错误" + error, tab.id);
            });
    }

    let prompt_text = apiPrompt.replace("{text}", selectedText);

    if (model_type === "generic") {
        fetchGeneric(apiName, apiKey, prompt_text, tab);
    } else if (model_type === "openai") {

        fetchOpenAI(apiName, apiKey, openai_model, prompt_text, tab);
    }

}

