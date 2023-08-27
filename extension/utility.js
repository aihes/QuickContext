// 注册最后点击的坐标
function registerLastClickedCoords(tabId) {
    chrome.tabs.executeScript(tabId, {
        code: `
        document.addEventListener('contextmenu', function(event) {
            window.lastClickedCoords = { x: event.clientX, y: event.clientY };
            console.log('Context menu clicked at:', window.lastClickedCoords);
        });
        `
    });
}
