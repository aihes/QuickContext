// WebSocket连接管理
let ws = null;
let reconnectCount = 0;
const MAX_RECONNECT_ATTEMPTS = 3;
let reconnectTimeout = null;

async function reportConnectionError(serverUrl, error) {
    try {
        const response = await fetch(`${serverUrl}/api/alert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'websocket_error',
                message: `WebSocket连接失败超过${MAX_RECONNECT_ATTEMPTS}次`,
                error: error?.message || 'Unknown error',
                timestamp: new Date().toISOString()
            })
        });
        
        if (!response.ok) {
            console.error('报警接口调用失败:', await response.text());
        }
    } catch (e) {
        console.error('调用报警接口时出错:', e);
    }
}

async function initializeWebSocket(isReconnect = false) {
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }

    const serverUrl = await getData('serverUrl') || 'http://localhost:8000';
    const wsUrl = await getData('wsUrl') || serverUrl.replace('http', 'ws') + '/ws';
    
    try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('WebSocket连接已建立到:', wsUrl);
            reconnectCount = 0;
        };
        
        ws.onclose = async (event) => {
            console.log(`WebSocket连接已关闭 (code: ${event.code}, reason: ${event.reason})`);
            
            if (event.code !== 1000) {
                reconnectCount++;
                
                if (reconnectCount <= MAX_RECONNECT_ATTEMPTS) {
                    const delay = Math.min(1000 * Math.pow(2, reconnectCount - 1), 10000);
                    console.log(`第${reconnectCount}次重试，将在${delay/1000}秒后重连...`);
                    
                    reconnectTimeout = setTimeout(() => {
                        initializeWebSocket(true);
                    }, delay);
                } else {
                    console.error(`WebSocket重连失败超过${MAX_RECONNECT_ATTEMPTS}次，发送报警`);
                    await reportConnectionError(serverUrl, {
                        message: `WebSocket connection failed after ${MAX_RECONNECT_ATTEMPTS} attempts`
                    });
                    
                    setTimeout(() => {
                        reconnectCount = 0;
                        initializeWebSocket(true);
                    }, 60000);
                }
            }
        };
        
        ws.onerror = (error) => {
            console.error('WebSocket错误:', error);
        };
        
        ws.onmessage = async (event) => {
            try {
                const message = JSON.parse(event.data);
                console.log('收到WebSocket消息:', message);
                
                if (message.type === 'capture') {
                    await handleCaptureMessage(message);
                }
            } catch (error) {
                console.error('处理WebSocket消息时出错:', error);
            }
        };
        
    } catch (error) {
        console.error('创建WebSocket连接时出错:', error);
        if (!isReconnect) {
            ws.onclose();
        }
    }
}

async function handleCaptureMessage(message) {
    console.log('开始处理截图请求:', message.url);
    
    // 打开新标签页
    const tab = await chrome.tabs.create({ url: message.url });
    console.log('已创建新标签页:', tab.id);
    
    // 等待页面加载完成并注入检查脚本
    await new Promise(resolve => {
        chrome.tabs.onUpdated.addListener(async function listener(tabId, info) {
            if (tabId === tab.id && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                console.log('页面初步加载完成:', message.url);
                
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        return new Promise((resolve) => {
                            let loadingTimeout;
                            let lastMutationTime = Date.now();
                            let stableCount = 0;
                            
                            const observer = new MutationObserver(() => {
                                lastMutationTime = Date.now();
                                stableCount = 0;
                            });
                            
                            observer.observe(document.documentElement, {
                                childList: true,
                                subtree: true,
                                attributes: true,
                                characterData: true
                            });
                            
                            const checkReadyState = () => {
                                // ... existing checkReadyState code ...
                            };
                            
                            loadingTimeout = setTimeout(() => {
                                observer.disconnect();
                                resolve();
                            }, 15000);
                            
                            checkReadyState();
                        });
                    }
                });
                
                console.log('页面完全加载完成，包括图片和样式');
                resolve();
            }
        });
    });
    
    // 截图
    console.log('开始截图...');
    const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png'
    });
    console.log('截图完成，数据长度:', screenshot.length);
    
    // 发送截图回服务器
    ws.send(JSON.stringify({
        type: 'screenshot',
        url: message.url,
        data: screenshot
    }));
    console.log('截图数据已发送到服务器');
    
    // 关闭标签页
    await chrome.tabs.remove(tab.id);
    console.log('已关闭标签页:', tab.id);
}

// 不使用export，而是直接暴露到全局作用域
self.initializeWebSocket = initializeWebSocket; 