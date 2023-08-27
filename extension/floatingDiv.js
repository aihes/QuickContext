async function executeFloatingDivScript(apiName, formattedResult) {
    try {
        if (typeof jQuery === 'undefined' || typeof jQuery.ui === 'undefined') {
            console.log('jQuery or jQuery UI is not loaded');
        } else {
            console.log('jQuery and jQuery UI are loaded');
        }

        if (!$('#myFloatingDiv').length) {
            $('body').append(`<div id="myFloatingDiv" title="${apiName}"></div>`);
            $('#myFloatingDiv').dialog({
                draggable: true,
                width: 500,
                close: function() { $(this).dialog('destroy').remove(); }
            });
        }
        $('#myFloatingDiv').html(formattedResult);
        $('#myFloatingDiv').dialog('option', 'position', {
            my: 'left top',
            at: 'left+' + (window.lastClickedCoords.x || 10) + ' top+' + (window.lastClickedCoords.y || 10),
            of: window
        });
        console.log("Code is executing!");
    } catch (e) {
        console.error(e);
    }
}

async function createFloatingDiv(apiName, trimmedResult, tabId) {
    let formattedResult = trimmedResult.replace(/\n/g, '<br>');

    try {
        await chrome.scripting.executeScript({
            target: {tabId},
            func: executeFloatingDivScript,
            args: [apiName, formattedResult]
        });
        console.log('Script executed.');
    } catch (error) {
        if (chrome.runtime.lastError) {
            console.log(chrome.runtime.lastError.message);
        }
        console.error(error);
    }
}
