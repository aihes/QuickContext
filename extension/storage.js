// V3版本的set数据
async function setData(key, value) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({key: value}, () => {
            resolve();
        });
    });
}


// v3版本的get数据
async function getData(key) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get([key], function (result) {
            resolve(result[key]);
        });
    });
}




