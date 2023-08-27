// 测试Manifest V3的功能，当前没有用到
// service_worker.js
importScripts('jquery-ui-1.13.2.custom/external/jquery/jquery.js');
importScripts('jquery-ui-1.13.2.custom/jquery-ui.min.js');
// importScripts('background.js');
importScripts('utility.js');
importScripts('api.js');
importScripts('floatingDiv.js');

// 这里放置你的初始化代码
// 右键菜单点击事件处理
chrome.contextMenus.onClicked.addListener(function (info, tab) {
    const selectedText = info.selectionText;
    const serverUrl = localStorage.getItem('serverUrl') || 'http://localhost:5001';
    const apiType = info.menuItemId;

    let apiConfigs = JSON.parse(localStorage.getItem('apiConfigs') || '[]');
    let defaultApiConfigs = [{
        apiType: 'translate_built_in', apiName: '翻译', apiPrompt: '将如下的内容{text}翻译为中文'
    }, {apiType: 'explain_built_in', apiName: '解释', apiPrompt: '帮我详细解释如下{text} 含义'}]
    let mergedConfigs = defaultApiConfigs.concat(apiConfigs);

    if (mergedConfigs.map(config => config.apiType).includes(apiType)) {
        fetchData(apiType, selectedText, serverUrl, tab);
    }
});

// 更新标签页时注册点击坐标
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete') {
        registerLastClickedCoords(tabId);
    }
    if (changeInfo.status === 'complete' && tab.active) {
        chrome.contextMenus.removeAll(() => {
            let apiConfigs = JSON.parse(localStorage.getItem('apiConfigs') || '[]');
            let defaultApiConfigs = [{
                apiType: 'translate_built_in', apiName: '翻译', apiPrompt: '将如下的内容{text}翻译为中文'
            }, {apiType: 'explain_built_in', apiName: '解释', apiPrompt: '帮我详细解释如下{text} 含义'}]
            let mergedConfigs = defaultApiConfigs.concat(apiConfigs);
            mergedConfigs.forEach(config => {
                chrome.contextMenus.create({
                    id: config.apiType,
                    title: config.apiName,
                    contexts: ['selection']
                });
            });
        });
    }
});

