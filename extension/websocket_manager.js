// WebSocket连接管理
let ws = null;
let reconnectCount = 0;
let reconnectTimeout = null;
const RECONNECT_INTERVAL = 3000; // 重连间隔3秒

async function reportConnectionError(serverUrl, error) {
    try {
        const response = await fetch(`${serverUrl}/api/alert`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'websocket_error',
                message: `WebSocket连接失败 (第${reconnectCount}次重试)`,
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

    const serverUrl = await getData('serverUrl') || 'http://localhost:5001';
    const wsUrl = await getData('wsUrl') || serverUrl.replace('http', 'ws') + '/ws';
    
    try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            console.log('WebSocket连接已建立到:', wsUrl);
            reconnectCount = 0; // 连接成功后重置计数器
        };
        
        ws.onclose = async (event) => {
            console.log(`WebSocket连接已关闭 (code: ${event.code}, reason: ${event.reason})`);
            
            if (event.code !== 1000) { // 如果不是正常关闭
                reconnectCount++;
                
                // 发送报警（每10次重试发送一次）
                if (reconnectCount % 10 === 0) {
                    await reportConnectionError(serverUrl, {
                        message: `WebSocket connection failed (retry attempt ${reconnectCount})`
                    });
                }
                
                console.log(`准备第${reconnectCount}次重试，将在${RECONNECT_INTERVAL/1000}秒后重连...`);
                
                // 始终进行重连，不设置最大重试次数
                reconnectTimeout = setTimeout(() => {
                    initializeWebSocket(true);
                }, RECONNECT_INTERVAL);
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
            ws?.close();
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