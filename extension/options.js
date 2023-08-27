$(document).ready(function () {
    // Load and render configurations
    // Initialize values from chrome.storage
    chrome.storage.local.get(['serverUrl', 'api_key', 'model_type', 'openai_model', 'apiConfigs'], function (result) {
        $("#serverUrl").val(result.serverUrl || '');
        $("#api_key").val(result.api_key || '');
        $("#model_type").val(result.model_type || 'openai');
        $("#openai_model").val(result.openai_model || 'gpt-3.5-turbo');

        toggleOpenAIModelDropdown($("#model_type").val());
        $("#model_type").change(function () {
            toggleOpenAIModelDropdown($(this).val());
        });

        renderApiConfigs(result.apiConfigs || []);
    });

    // Save button
    $("#save").click(function () {
        chrome.storage.local.set({
            'serverUrl': $("#serverUrl").val(),
            'api_key': $("#api_key").val(),
            'model_type': $("#model_type").val(),
            'openai_model': $("#openai_model").val()
        });
        saveApiConfigs()
    });

    // Add API button
    $("#addApi").click(function () {
        chrome.storage.local.get(['apiConfigs'], function (result) {
            let apiConfigs = result.apiConfigs || [];
            apiConfigs.push({apiType: '', apiName: '', apiPrompt: ''});
            renderApiConfigs(apiConfigs);
            chrome.storage.local.set({'apiConfigs': apiConfigs});
        });
    });
});

// The rest of your functions (like toggleOpenAIModelDropdown, renderApiConfigs, etc.) can mostly remain the same
// 显示或隐藏 openai_model 下拉选择框
function toggleOpenAIModelDropdown(selectedValue) {
    if (selectedValue === "openai") {
        $("#openai_model_div").show();
    } else {
        $("#openai_model_div").hide();
    }
}

function renderApiConfigs(apiConfigs) {
    let $apiList = $("#apiList");
    $apiList.empty();

    let $table = $("<table>").addClass("table table-striped"); // Bootstrap table
    $table.append(`<thead><tr><th>API Type</th><th>API Name</th><th>API Prompt</th><th>Actions</th></tr></thead>`); // Table header
    let $tbody = $("<tbody>");

    apiConfigs.forEach((config, index) => {
        let $row = $("<tr>");
        $row.append(`<td><input class="apiType form-control" placeholder="Just a label, won't appear in the request" value="${config.apiType}"></td>`);
        $row.append(`<td><input class="apiName form-control" placeholder="Menu that pops up when you right-click" value="${config.apiName}"></td>`);
        $row.append(`<td><textarea class="apiPrompt form-control" rows="3" placeholder="Prompt for requesting LLM, {text} is the text you've selected, remember to include it.">${config.apiPrompt}</textarea></td>`); // Textarea for multi-line

        let $actionCol = $("<td>");
        $actionCol.append('<button class="btn btn-primary update-api-button">更新</button> ');
        $actionCol.append('<button class="btn btn-danger remove-api-button">删除</button>');
        $row.append($actionCol);

        $row.find(".update-api-button").click(() => updateApi(index));
        $row.find(".remove-api-button").click(() => removeApi(index));

        $tbody.append($row);
    });

    $table.append($tbody);
    $apiList.append($table);
}

function saveApiConfigs() {
    let apiConfigs = $(".apiType, .apiName, .apiPrompt")
        .map(function () {
            return $(this).val();
        })
        .get()
        .reduce((acc, val, i, arr) => {
            if (i % 3 === 0) {
                acc.push({apiType: val, apiName: arr[i + 1], apiPrompt: arr[i + 2]});
            }
            return acc;
        }, []);

    chrome.storage.local.set({'apiConfigs': apiConfigs});
    return apiConfigs;
}

async function updateApi(index) {
    const getStorageData = () => {
        return new Promise((resolve) => {
            chrome.storage.local.get(['apiConfigs'], (result) => {
                resolve(result.apiConfigs ? result.apiConfigs : []);
            });
        });
    };

    let apiConfigs = await getStorageData();

    apiConfigs[index] = {
        apiType: $(`.apiType:eq(${index})`).val(),
        apiName: $(`.apiName:eq(${index})`).val(),
        apiPrompt: $(`.apiPrompt:eq(${index})`).val()
    };

    chrome.storage.local.set({apiConfigs: apiConfigs}, () => {
        renderApiConfigs(apiConfigs);
    });
}

async function removeApi(index) {
    const getStorageData = () => {
        return new Promise((resolve) => {
            chrome.storage.local.get(['apiConfigs'], (result) => {
                resolve(result.apiConfigs ? result.apiConfigs : []);
            });
        });
    };

    let apiConfigs = await getStorageData();
    apiConfigs.splice(index, 1);

    chrome.storage.local.set({apiConfigs: apiConfigs}, () => {
        renderApiConfigs(apiConfigs);
    });
}

