// 注册最后点击的坐标
async function registerLastClickedCoords(tabId) {
    try {
        chrome.tabs.get(tabId, async function (tab) {
            if (chrome.runtime.lastError || !tab) {
                console.error(`Tab ${tabId} is not valid:`, chrome.runtime.lastError);
                return;
            }
            // 检查URL是否为chrome://类型
            if (tab.url.startsWith('chrome://')) {
                console.warn(`Cannot execute script on chrome:// URL: ${tab.url}`);
                return;
            }
            if (tab.url.startsWith('chrome-extension://')) {
                console.warn(`Cannot execute script on chrome-extension:// URL: ${tab.url}`);
                return;
            }
            await chrome.scripting.executeScript({
                target: {tabId},
                function: () => {
                    document.addEventListener('contextmenu', function (event) {
                        window.lastClickedCoords = {x: event.clientX, y: event.clientY};
                        console.log('Context menu clicked at:', window.lastClickedCoords);
                    });
                }
            });
        });
    } catch (error) {
        console.error(`Error executing script on tab ${tabId}:`, error);
    }
}
