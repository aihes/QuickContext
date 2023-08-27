$(document).ready(function () {
    // Load and render configurations
    // Initialize values from localStorage
    $("#serverUrl").val(localStorage.getItem('serverUrl') || '');
    $("#api_key").val(localStorage.getItem('api_key') || '');
    $("#model_type").val(localStorage.getItem('model_type') || 'generic'); // Default to 'generic' if not set
    $("#openai_model").val(localStorage.getItem('openai_model') || 'gpt-3.5-turbo'); // Default to 'gpt-3.5-turbo' if not set

    toggleOpenAIModelDropdown($("#model_type").val());
    $("#model_type").change(function () {
        toggleOpenAIModelDropdown($(this).val());
    });

    let apiConfigs = JSON.parse(localStorage.getItem('apiConfigs') || JSON.stringify([]));
    renderApiConfigs(apiConfigs);

// Save button
    $("#save").click(function () {
        localStorage.setItem('serverUrl', $("#serverUrl").val());
        localStorage.setItem('api_key', $("#api_key").val());
        localStorage.setItem('model_type', $("#model_type").val()); // Save model_type
        localStorage.setItem('openai_model', $("#openai_model").val()); // 新增：保存 openai_model
        saveApiConfigs();
    });


    // Add API button
    $("#addApi").click(function () {
        saveApiConfigs();
        let apiConfigs = JSON.parse(localStorage.getItem('apiConfigs') || JSON.stringify([]))
        apiConfigs.push({apiType: '', apiName: '', apiPrompt: ''});
        renderApiConfigs(apiConfigs);
    });
});

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

    localStorage.setItem('apiConfigs', JSON.stringify(apiConfigs));
}

function updateApi(index) {
    let apiConfigs = JSON.parse(localStorage.getItem('apiConfigs'));
    apiConfigs[index] = {
        apiType: $(`.apiType:eq(${index})`).val(),
        apiName: $(`.apiName:eq(${index})`).val(),
        apiPrompt: $(`.apiPrompt:eq(${index})`).val()
    };
    localStorage.setItem('apiConfigs', JSON.stringify(apiConfigs));
    renderApiConfigs(apiConfigs);
}

function removeApi(index) {
    let apiConfigs = JSON.parse(localStorage.getItem('apiConfigs'));
    apiConfigs.splice(index, 1);
    localStorage.setItem('apiConfigs', JSON.stringify(apiConfigs));
    renderApiConfigs(apiConfigs);
}
